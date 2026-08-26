package com.vellor.care.infrastructure.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class DataSourceConfig {

    @Value("${spring.datasource.url:}")
    private String configuredUrl;

    @Value("${spring.datasource.username:}")
    private String configuredUser;

    @Value("${spring.datasource.password:}")
    private String configuredPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setPoolName("vellor-pool");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setDriverClassName("org.postgresql.Driver");

        String databaseUrl = System.getenv("DATABASE_URL");
        String databasePublicUrl = System.getenv("DATABASE_PUBLIC_URL");
        String springDatasourceUrl = System.getenv("SPRING_DATASOURCE_URL");

        String rawUrl = springDatasourceUrl;
        if (rawUrl == null || rawUrl.isBlank() || rawUrl.contains("://:/")) {
            rawUrl = databaseUrl != null && !databaseUrl.isBlank() ? databaseUrl : databasePublicUrl;
        }

        if (rawUrl != null && !rawUrl.isBlank() && !rawUrl.contains("://:/")) {
            try {
                if (rawUrl.startsWith("jdbc:postgresql://")) {
                    config.setJdbcUrl(rawUrl);
                    if (configuredUser != null && !configuredUser.isBlank()) config.setUsername(configuredUser);
                    if (configuredPassword != null && !configuredPassword.isBlank()) config.setPassword(configuredPassword);
                } else if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
                    // Parser para URLs padrão do Railway/Render/Heroku: postgresql://user:password@host:port/database
                    URI uri = new URI(rawUrl.replace("postgres://", "postgresql://"));
                    String host = uri.getHost();
                    int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                    String path = uri.getPath(); // /database
                    String database = (path != null && path.length() > 1) ? path.substring(1) : "railway";

                    String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, database);
                    config.setJdbcUrl(jdbcUrl);

                    String userInfo = uri.getUserInfo();
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        config.setUsername(parts[0]);
                        config.setPassword(parts[1]);
                    }
                    log.info("Conexão configurada via DATABASE_URL: jdbc:postgresql://{}:{}/{}", host, port, database);
                }
            } catch (Exception e) {
                log.warn("Erro ao fazer parse da DATABASE_URL, aplicando fallback padrão", e);
            }
        }

        // Se ainda não estiver configurado o JDBC URL válido
        if (config.getJdbcUrl() == null || config.getJdbcUrl().contains("://:/")) {
            String host = System.getenv("PGHOST") != null && !System.getenv("PGHOST").isBlank() ? System.getenv("PGHOST") : "localhost";
            String port = System.getenv("PGPORT") != null && !System.getenv("PGPORT").isBlank() ? System.getenv("PGPORT") : "5432";
            String db = System.getenv("PGDATABASE") != null && !System.getenv("PGDATABASE").isBlank() ? System.getenv("PGDATABASE") : "vellor_care";
            String user = System.getenv("PGUSER") != null && !System.getenv("PGUSER").isBlank() ? System.getenv("PGUSER") : (configuredUser != null && !configuredUser.isBlank() ? configuredUser : "vellor");
            String pass = System.getenv("PGPASSWORD") != null && !System.getenv("PGPASSWORD").isBlank() ? System.getenv("PGPASSWORD") : (configuredPassword != null && !configuredPassword.isBlank() ? configuredPassword : "vellor");

            String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s", host, port, db);
            config.setJdbcUrl(jdbcUrl);
            config.setUsername(user);
            config.setPassword(pass);
            log.info("Conexão configurada via variáveis PG*: {}", jdbcUrl);
        }

        return new HikariDataSource(config);
    }
}
