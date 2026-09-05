package com.cospace.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoSpaceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoSpaceApplication.class, args);
    }
}
