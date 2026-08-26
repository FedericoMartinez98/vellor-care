package com.vellor.care.domain.model;

import java.util.UUID;

public record ComputerAssignment(
    String employeeName,
    String employeeEmail,
    UUID sectorId,
    UUID unitId,
    String location
) {}
