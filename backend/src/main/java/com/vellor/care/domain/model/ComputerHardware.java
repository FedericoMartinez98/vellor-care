package com.vellor.care.domain.model;

import java.time.LocalDate;

public record ComputerHardware(
    String processor,
    int ramGb,
    String ramDetail,
    StorageType storageType,
    int storageGb,
    String storageDetail,
    String gpu,
    String powerSupply,
    String motherboard,
    LocalDate acquisitionDate
) {}
