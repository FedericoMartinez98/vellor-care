# Vellor PC Care — Contexto do projeto (27/08/2026)

Sistema interno da Plenitude Distribuidora para gestão e manutenção preventiva
de PCs: backend Spring Boot (Java 21), frontend Next.js, e um coletor
PowerShell que roda nas máquinas Windows.

Repositório: https://github.com/FedericoMartinez98/vellor-care
(**público** — ver seção de segurança.)

---

## O ponto mais importante para entender este projeto

O app nasceu como **protótipo 100% front-end**: todas as telas liam e
gravavam num "banco" falso guardado no `localStorage` do navegador. O backend
Spring + Postgres existia em paralelo, completo, mas **nenhuma tela falava com
ele**. Há um comentário do autor original em
`frontend/src/lib/api/index.ts` dizendo exatamente isso.

O trabalho recente tem sido religar tela por tela ao backend real. O
mecanismo é sempre o mesmo:

- `isRemoteBackend()` (em `lib/api/client.ts`) devolve `true` quando
  `NEXT_PUBLIC_API_BASE_URL` está definida.
- Quando `true`, a tela usa hooks reais (`useRealInventory`,
  `useRealMaintenances`, `useRealUsers`, `useRealParts`, `useRealAuth`).
- Quando `false` (ex: o deploy de demonstração na Vercel), a tela continua no
  modo mock de sempre. **Nada quebra sem a variável.**

### Status por tela

| Tela | Estado |
|---|---|
| Login / sessão / logout | **real** (com guard de rota) |
| Inventário (lista, ficha, criar, editar, excluir) | **real** |
| Importar Telemetria (CSV) | **real** (com auto-cadastro) |
| Preventivas — Fila de Equipamentos | **real** |
| Preventivas — Ordens de Serviço (criar/executar/concluir/reagendar) | **real** |
| Configurações → Usuários (criar/editar/excluir) | **real** |
| Dashboard | mock |
| Calendário | mock |
| Histórico | mock |
| Relatórios | mock |
| Estoque de Peças (tela própria) | mock — mas o **catálogo** já é lido do backend real no seletor de peças da preventiva, e a baixa de estoque na conclusão é real |
| Setores | mock |
| Saúde | mock |
| Notificações (sininho) / busca global (Cmd+K) | mock |

Ao religar uma tela nova, o cuidado recorrente: os hooks `useReal*` **não são
stores globais** — cada componente tem sua própria cópia. Depois de uma
escrita num diálogo, o componente pai precisa chamar `refresh()` (via
`onSuccess`), senão a lista fica com o dado velho até um F5. Esse bug já
apareceu duas vezes.

---

## O coletor de telemetria (`agent/vellor-agent.ps1`)

Rodava como tarefa agendada de hora em hora, em segundo plano, com a chave de
API embutida no script. Foi reescrito de propósito para **não fazer rede
nenhuma**: roda uma vez, manualmente, lê o hardware via WMI/CIM e grava um
`.csv` na Área de Trabalho. Quem executou sobe esse arquivo na tela
"Importar Telemetria".

Motivo: um agente vigiando em background com segredo compartilhado em cada
máquina é superfície de ataque desnecessária para o caso de uso.

Na importação, cada linha do CSV:
- se o `assetTag`/`hostname` **não** existe → cadastra o computador
  automaticamente (com o hardware que o coletor manda), num setor/unidade
  provisórios "Não Classificado" para a equipe revisar depois;
- se **já** existe → grava o snapshot de saúde do dia e dispara uma
  notificação (deduplicada por dia).

Detalhe que já causou bug: `Export-Csv` do PowerShell grava um BOM UTF-8 que
gruda no nome da primeira coluna do cabeçalho. O importador remove isso.

---

## Preventiva automática a cada 30 dias

Todo computador novo (cadastro manual, CSV ou auto-cadastro) nasce com a
próxima preventiva agendada para **30 dias** depois. Quando uma preventiva é
concluída, o sistema reagenda a próxima usando o intervalo salvo no próprio
computador — ou seja, o ciclo se repete sozinho.

Valor central em `CreateComputerUseCase.DEFAULT_MAINTENANCE_INTERVAL_DAYS`
(backend) e `DEFAULT_MAINTENANCE_INTERVAL_DAYS` em `lib/constants.ts`
(frontend). Havia uma config `maintenance.default-interval-days` no
`application.yml` que **nunca era lida por código nenhum** — está lá só
documentando a intenção.

---

## Ambiente local (sem Docker, sem admin)

Tudo portátil em `C:\Users\ti03\dev-tools\`:
- JDK 21 (Temurin) — `jdk-21.0.12.1+1`
- Maven 3.9.16 — `apache-maven-3.9.16`
- PostgreSQL 16.4 — `pgsql`, dados em `pgdata`

**Subir o Postgres:**
```powershell
C:\Users\ti03\dev-tools\pgsql\bin\pg_ctl.exe -D "C:\Users\ti03\dev-tools\pgdata" -l "C:\Users\ti03\dev-tools\pg.log" start
```

**Subir o backend:**
```powershell
$env:JAVA_HOME = "C:\Users\ti03\dev-tools\jdk-21.0.12.1+1"
$env:Path = "$env:JAVA_HOME\bin;C:\Users\ti03\dev-tools\apache-maven-3.9.16\bin;$env:Path"
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/vellor_care"
$env:SPRING_DATASOURCE_USERNAME = "vellor"
$env:SPRING_DATASOURCE_PASSWORD = "vellor"
$env:VELLOR_JWT_SECRET = "<32+ bytes>"
$env:VELLOR_AGENT_KEY = "<qualquer valor>"
$env:VELLOR_CORS_ORIGINS = "http://localhost:3000,http://PLENITUDE-63:3000"
cd backend; mvn spring-boot:run
```

**Subir o frontend** (precisa do `.env.local` com
`NEXT_PUBLIC_API_BASE_URL=http://PLENITUDE-63:8080/api/v1`):
```powershell
cd frontend; npm run dev -- -H 0.0.0.0 -p 3000
```

`VELLOR_JWT_SECRET` e `VELLOR_AGENT_KEY` são **obrigatórias** — a aplicação
não sobe sem elas (de propósito).

---

## Onde isso roda hoje

- **Servidor interno (em uso):** backend + Postgres na máquina
  `PLENITUDE-63`, acessível na rede local em `http://PLENITUDE-63:3000`.
  Frágil: se a máquina desligar, o sistema cai para todos, e não há backup
  automático do banco. É solução "por enquanto".
- **Vercel:** frontend em `frontend-kappa-ten-34.vercel.app`. Atenção — a
  rota `/api/agent/telemetry` lá é um **stub**: responde sucesso mas não
  salva nada. Não é o pipeline real.
- **Railway:** o domínio `vellor-care-production.up.railway.app` serve o
  **frontend** (Next.js), não o backend Java. A URL real do backend no
  Railway nunca foi encontrada no repo — provavelmente nunca rodou lá.
  O plano trial do Railway dá ~US$5 de crédito único (não mensal).
- Alternativa avaliada para hospedar de graça: **Render** (tier grátis real,
  mas com cold start e Postgres que expira).

Contas atuais no banco local: `ti@plenitudedistribuidora.com` (senha
`Vellor123`) e `admin@teste.local` — ambas ADMINISTRADOR. Usuários novos se
criam pela tela (Configurações → Usuários).

---

## Segurança — o que foi corrigido

Esta sessão começou como um teste de vazamento de informação. Achados:

- `VELLOR_JWT_SECRET` e `VELLOR_AGENT_KEY` estavam **hardcoded** no código.
  Pior: os nomes das properties Java não batiam com o `application.yml`,
  então a env var configurada no ambiente **nunca era aplicada** — o fallback
  hardcoded sempre vencia. Corrigido, sem fallback.
- `GET /auth/me` e `GET /users` devolviam o registro de domínio inteiro,
  **vazando o hash BCrypt** de senha. Agora usam DTOs.
- Comparação da API key do agente virou tempo constante.
- CORS ignorava `VELLOR_CORS_ORIGINS` (mais uma config "morta") e só aceitava
  `localhost` — ninguém na rede conseguia logar. Corrigido.
- `POST /users` caía num `"password123"` silencioso quando a senha não vinha.
  Agora exige senha (mínimo 8).
- `POST/PUT/DELETE /users` não tinha restrição de papel — qualquer sessão
  autenticada podia criar um ADMINISTRADOR. Agora só ADMINISTRADOR.
- Login não validava senha (qualquer coisa entrava como admin), não havia
  guard de rota, e havia 3 botões que pulavam a autenticação. Tudo corrigido.

### Pendências de segurança conhecidas

1. **O histórico do git ainda tem os segredos antigos**, e o repo é público.
   Foram rotacionados, mas quem clonar o histórico vê os valores antigos.
   Reescrever o histórico (`git filter-repo`/BFG) não foi feito — é
   destrutivo e exige force-push.
2. **Sem autorização por setor:** qualquer usuário autenticado vê dados de
   qualquer computador/setor. Pode ser intencional para ferramenta interna
   única — precisa decisão.
3. Refresh token é guardado em texto plano no banco (a coluna se chamava
   `token_hash`, sugerindo a intenção, mas o código nunca hasheou).
4. `/actuator/health,info,metrics` é público (detalhe limitado por
   `show-details: when-authorized`).

---

## Padrão de bug que se repete neste projeto

Vale conhecer porque já apareceu **mais de dez vezes**: o schema SQL (Flyway)
e as entidades JPA divergem, e o Hibernate/Postgres só reclama em runtime.

- **Coluna `NOT NULL` que a entidade não mapeia** → o INSERT sai sem ela e
  estoura. Aconteceu com `maintenances.sector_id`,
  `inventory_movements.part_name`/`user_name`, `maintenance_parts.part_name`.
- **Nome de coluna/tabela diferente** do que a entidade espera → a aplicação
  não sobe (`ddl-auto: validate`). Aconteceu com 6 campos, corrigidos nas
  migrations V4/V5.
- **Coluna curta demais** → `maintenance_photos.url` era `VARCHAR(500)` mas
  recebe foto em data-URL base64 (KBs). Alargada para TEXT na V6.
- **`LazyInitializationException` (500)** quando um mapper desreferencia
  associação lazy fora de transação. Derrubou `/auth/me`, `/users`,
  `/notifications` e `/maintenances`. Para usuários a correção ficou no
  `UserRepositoryAdapter` (um ponto só, porque o `UserMapper` sempre toca
  `permissions`/`sector`).

**Como auditar isso de uma vez** (em vez de descobrir um por restart):
compare as colunas `NOT NULL` sem default de cada tabela com os
`@Column(name = ...)` da entidade correspondente. Na última passada só sobrou
`audit_log`, que não tem entidade nem uso.

Divergência ainda em aberto: `inventory_movements.reason` é
`VARCHAR(300)` no banco mas a entidade declara `columnDefinition = "TEXT"`.
Não incomoda hoje (os textos gerados são curtos), mas um motivo longo digitado
na tela de estoque quebraria.

---

## Cuidados de integridade de dado (já corrigidos, mas fique atento)

Com os registros passando a ser reais, dois comportamentos do protótipo
viraram problema e foram removidos:

- "Marcar tudo como feito" no checklist **inventava medições** (45% de disco,
  48°C de CPU, 39°C de SSD fixos) que iam para o histórico e relatórios como
  se tivessem sido medidas.
- O cronômetro da execução **sobrescrevia o campo de duração a cada segundo**,
  tornando impossível corrigir o tempo à mão.

Vale reler com esse olhar qualquer parte do protótipo que ainda não foi
religada — pode ter mais preenchimento automático plausível-mas-falso.

---

## Como validar mudanças aqui

Não confie no "parece que funcionou": a interface mostrava sucesso em vários
fluxos que não gravavam nada. O ciclo que pegou os bugs reais foi:

1. `cd frontend && npm run typecheck`
2. exercitar o fluxo **pela tela**, não só por `curl`
3. **conferir no Postgres** que gravou (`psql ... -c "SELECT ..."`)
4. limpar os dados de teste depois
