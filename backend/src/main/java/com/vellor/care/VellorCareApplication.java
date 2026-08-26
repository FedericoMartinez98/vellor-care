package com.vellor.care;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * Vellor Care — Sistema de Gestão de Ativos de TI e Manutenção Preventiva.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class VellorCareApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(VellorCareApplication.class, args);
    }
}
