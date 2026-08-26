# Vellor Care

Sistema de gestão de ativos de TI e manutenção preventiva de computadores corporativos.

Controla o inventário de máquinas, organiza as limpezas preventivas com checklist assinado,
registra todo o histórico por equipamento, acompanha a saúde do hardware e avisa a equipe de
TI antes que uma manutenção vença.

```
Vellor PC Care/
├── frontend/     Next.js 15 · React 19 · TypeScript · TailwindCSS 4 · shadcn/ui
├── backend/      Java 21 · Spring Boot 3 · PostgreSQL · Flyway · JWT
├── docs/         documentação de arquitetura
└── docker-compose.yml
```

---

## Estado atual do projeto

| Parte | Situação | Verificado |
| --- | --- | --- |
| Front-end | Completo e executável | `tsc --noEmit` e `next build` limpos; telas conferidas no navegador |
| Back-end | Código-fonte completo | **Não compilado** — esta máquina não tem JDK 21 nem Maven |
| Banco de dados | Migrations Flyway completas (V1–V3) | Revisadas manualmente; não executadas |

> **Leia antes de rodar o back-end.** O código Java foi escrito por inteiro, mas não existe
> JDK, Maven, Docker ou PostgreSQL nesta máquina, então nada dele foi compilado nem
> executado. Espere ajustes de compilação no primeiro `mvn clean package`. O front-end, ao
> contrário, foi construído e verificado de ponta a ponta.

O front-end funciona **hoje, sozinho**, sem back-end: os dados vivem num store reativo
semeado com um conjunto realista (64 computadores, 210 manutenções, 26 peças, 10 setores) e
persistido em `localStorage`. Isso permite demonstrar e validar todo o fluxo antes de subir a
infraestrutura. A troca para a API real é uma variável de ambiente — ver
[Ligando no back-end](#ligando-no-back-end).

---

## Rodando o front-end

Requisitos: Node.js 20+ (testado no 24).

```bash
cd frontend && npm install && npm run dev
```

Abra <http://localhost:3000>. Não precisa de banco, de API nem de login — a tela de entrada
existe em `/login`, mas o sistema é navegável direto.

Outros comandos:

```bash
npm run build
```

```bash
npm run typecheck
```

### Se quiser começar do zero

Os dados ficam no navegador. **Configurações → Dados → Restaurar dados de demonstração**
devolve o seed original. A mesma aba exporta e importa um backup `.json`.

---

## Rodando o back-end

Requisitos: JDK 21, Maven 3.9+, PostgreSQL 16 (ou Docker).

Suba o banco:

```bash
docker compose up -d db
```

Rode a API com o profile de demonstração, que popula o banco:

```bash
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

A API sobe em <http://localhost:8080>, com Swagger em
<http://localhost:8080/swagger-ui.html>.

**Senha do administrador:** não existe senha padrão fixa — isso seria uma porta aberta. Na
primeira subida, o `AdminUserInitializer` cria `admin@vellor.com.br` e, se
`VELLOR_ADMIN_PASSWORD` não estiver definida, gera uma senha aleatória e a imprime **uma
única vez** no log, em nível `WARN`. Para definir você mesmo:

```bash
VELLOR_ADMIN_EMAIL=ti@empresa.com.br VELLOR_ADMIN_PASSWORD='sua-senha-forte' mvn spring-boot:run
```

Antes de expor em rede, troque também `VELLOR_JWT_SECRET` (mínimo 32 bytes) e
`VELLOR_AGENT_KEY`.

### Tudo de uma vez

```bash
docker compose up --build
```

---

## Ligando no back-end

Por padrão o front-end usa o store local. Para consumir a API:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A camada `frontend/src/lib/api/` já espelha o contrato REST inteiro — cliente com JWT,
mapa de endpoints e serviços tipados por recurso (`computersApi`, `maintenancesApi`, …).
O que falta é trocar as chamadas do `DataProvider` por esses serviços; os tipos de entrada e
saída são os mesmos dos dois lados, então a substituição é mecânica, recurso por recurso.

---

## O que o sistema faz

**Dashboard** — total de computadores, preventivas do mês, atrasadas, concluídas hoje e
equipamentos críticos; gráficos de preventivas por mês, equipamentos por setor, status das
preventivas e tempo médio de manutenção; atividades recentes e uma lista do que precisa de
atenção agora.

**Inventário** — CRUD completo com identificação, responsável, hardware, sistema, garantia e
status. A ficha do equipamento reúne todos os dados, a linha do tempo de manutenções, o
painel de saúde e a etiqueta patrimonial.

**Preventivas** — a lista operacional com o semáforo verde/amarelo/vermelho por equipamento,
e a execução do checklist de 21 itens com medições, peças, fotos antes/depois, cronômetro e
assinatura do técnico. Concluir uma preventiva baixa o estoque, agenda a próxima e fecha o
histórico numa transação só.

**Calendário** — visões de mês, semana e dia, com arrastar-e-soltar para reagendar.

**Histórico** — toda a base de atendimentos, com filtro por período, equipamento, setor,
técnico e tipo, e exportação em CSV.

**Estoque de peças** — CRUD, movimentações auditáveis (entrada, saída, ajuste, descarte) e
baixa automática quando uma peça é usada numa manutenção. O saldo nasce de movimentação, não
de digitação — é o que faz a auditoria fechar.

**Setores** — os 10 setores da empresa com quantidade de máquinas, preventivas pendentes e
concluídas, e o percentual em dia.

**Saúde** — SMART do SSD, temperaturas de CPU/GPU/SSD, uso de CPU e RAM, espaço livre, tempo
ligado e última reinicialização, em indicadores circulares verde/amarelo/vermelho.

**Relatórios** — preventivas por período, computadores por setor, histórico de um
equipamento, peças utilizadas e produtividade dos técnicos, exportáveis em PDF, Excel e CSV.

**QR Code patrimonial** — cada máquina gera um QR que abre a própria ficha, com impressão de
etiqueta em folha comum ou em impressora Zebra (ZPL II, 50×30 mm, `^CI28` para acentos).

**Alertas automáticos** — preventiva vencendo em 7 dias, vencendo hoje ou atrasada; SSD com
saúde abaixo de 20%; temperatura acima de 85 °C; máquina sem manutenção há mais de 120 dias;
peça abaixo do estoque mínimo. Aparecem no sino da navbar e não se repetem no mesmo dia
(chave de deduplicação `TIPO:id:data`).

**Usuários e permissões** — perfis Administrador, Técnico TI e Visualizador, com matriz de
permissão por módulo. Autenticação JWT, estrutura pronta para Active Directory.

---

## Arquitetura

### Front-end

```
src/
├── app/                 App Router — (app)/ é o shell com sidebar+navbar; /login fica fora
├── components/
│   ├── ui/              shadcn/ui new-york, escrito no repositório (31 primitivas)
│   ├── layout/          sidebar, navbar, busca global (Ctrl+K), notificações, tema
│   ├── charts/          wrappers de Recharts + HealthRing em SVG puro
│   ├── shared/          DataTable (TanStack), StatCard, badges, uploader, assinatura…
│   └── <módulo>/        componentes de cada tela
└── lib/
    ├── types.ts         modelo de domínio — espelha 1:1 os DTOs do back-end
    ├── constants.ts     catálogo do checklist, rótulos pt-BR, limiares, tons
    ├── status.ts        regras de negócio puras (semáforo, criticidade, faixas de saúde)
    ├── schemas.ts       validação Zod de todos os formulários
    ├── store/           DataProvider + seletores derivados
    ├── data/seed.ts     dataset determinístico (PRNG semeado — sem Math.random)
    ├── api/             cliente REST tipado, pronto para o back-end
    └── export/          PDF (jsPDF), Excel (ExcelJS), CSV (PapaParse)
```

Duas decisões que valem explicação:

**O seed é determinístico.** Usa um PRNG `mulberry32` com semente fixa, nunca
`Math.random()`. Um dataset que muda a cada render tornaria impossível reproduzir um bug.

**O store hidrata só no cliente.** `ready` fica `false` até o `localStorage` ser lido, e as
telas mostram esqueletos nesse intervalo. É isso que evita divergência de hidratação entre
servidor e navegador, já que os dados dependem da data de hoje.

### Back-end

Clean Architecture, com as dependências sempre apontando para dentro:

```
com.vellor.care
├── domain/          núcleo em Java puro — zero import de Spring, JPA ou web
│   ├── model/       entidades e value objects como records imutáveis
│   ├── repository/  portas (interfaces) que o domínio precisa
│   └── service/     regras que cruzam entidades (semáforo, criticidade, alertas)
├── application/     casos de uso — um caso de uso, uma classe, um método execute()
├── infrastructure/  adaptadores de saída: JPA, segurança, storage, agendador, exportadores
└── interfaces/rest/ adaptadores de entrada: controllers, DTOs, tratamento de erro
```

O domínio não conhece Spring. Os serviços de domínio viram beans em `DomainServiceConfig`,
não por anotação — é o que mantém o núcleo testável sem contexto de aplicação.

O schema é controlado exclusivamente pelo Flyway, com `ddl-auto: validate`. O Hibernate
nunca cria nem altera tabela: qualquer divergência entre `@Entity` e migration derruba a
aplicação na subida, que é exatamente o comportamento desejado.

---

## Banco de dados

16 tabelas normalizadas em `backend/src/main/resources/db/migration/`:

| Migration | Conteúdo |
| --- | --- |
| `V1__baseline_schema.sql` | Schema completo: units, sectors, users, user_permissions, refresh_tokens, computers, computer_health_snapshots, inventory_parts, maintenances, maintenance_checklist_items, maintenance_photos, maintenance_parts, inventory_movements, notifications, reports, audit_log |
| `V2__seed_reference_data.sql` | Unidades, os 10 setores e o catálogo de 26 peças |
| `V3__indexes_and_views.sql` | Índices de consulta e as views `v_computer_latest_health` e `v_sector_compliance` |

Enums são `VARCHAR` + `CHECK`, não tipos enumerados do Postgres — evolução de valor não
exige `ALTER TYPE`. PKs são UUID gerados na aplicação. Toda FK tem índice explícito.

`V2` cria as peças com **quantidade zero de propósito**: o saldo entra por movimentação de
`ENTRADA`, para que `inventory_movements` seja a única fonte de verdade do estoque desde o
primeiro dia.

---

## API REST

Base: `/api/v1`. Documentação viva em `/swagger-ui.html`.

| Recurso | Endpoints |
| --- | --- |
| `auth` | `POST /login`, `POST /refresh`, `GET /me`, `POST /logout` |
| `computers` | CRUD + `/{id}/maintenances`, `/{id}/health`, `/{id}/qrcode`, `/{id}/label.zpl`, `/{id}/photo` |
| `maintenances` | CRUD + `/{id}/start`, `/{id}/complete`, `/{id}/cancel`, `/{id}/reschedule`, `/{id}/photos`, `/calendar` |
| `preventives` | `GET /` (semáforo), `GET /calendar` |
| `sectors` | CRUD + `/summary` |
| `parts` | CRUD + `/{id}/movements`, `/movements` |
| `notifications` | `GET /`, `/count`, `PATCH /{id}/read`, `POST /read-all`, `POST /scan` |
| `dashboard` | `/metrics`, `/monthly`, `/sectors`, `/status`, `/duration`, `/activity` |
| `reports` | 5 relatórios + `/{reportKey}/export?format=pdf\|xlsx\|csv` |
| `users` | CRUD (somente Administrador) |
| `search` | `GET /?q=` — busca global |
| `agent` | `POST /telemetry` — ingestão do agente Windows |

Erros seguem RFC 7807 (`ProblemDetail`), com mensagens em português e, na validação, um mapa
`errors` de campo para mensagem.

---

## Agente Windows

O sistema já está preparado para receber telemetria automática das estações: a tabela de
snapshots é versionada por coleta, cada leitura marca sua origem (`MANUAL` ou `AGENTE`), e a
autenticação de máquina é separada da de usuário (header `X-Vellor-Agent-Key`, não JWT).

O agente em si ainda não faz parte deste repositório. O contrato de ingestão, as fontes WMI
de cada métrica e o endurecimento recomendado antes de produção estão em
[`docs/agente-windows.md`](docs/agente-windows.md).

---

## Segurança — o que já está feito e o que falta

Feito: JWT HS256 com refresh rotativo e revogável, senhas em BCrypt (força 12), autorização
por papel e por método, CORS restrito por configuração, validação em toda entrada, proteção
contra path traversal no upload, whitelist nos campos de ordenação (bloqueia injeção via
parâmetro de `sort`), e comparação em tempo constante na chave do agente.

Falta, antes de expor fora da rede interna:

1. **TLS.** A chave do agente e o JWT trafegam em header; sem HTTPS ambos vão em texto claro.
2. **Chave por máquina.** Hoje a chave de ingestão é única e global. Uma chave por estação
   permite revogar uma máquina comprometida sem girar a de todas.
3. **Rotação do segredo JWT.** O valor em `application.yml` é um placeholder de
   desenvolvimento e precisa ser substituído por variável de ambiente.
4. **Rate limiting** no `/auth/login`, hoje ausente.

---

## Licença

Uso interno.
