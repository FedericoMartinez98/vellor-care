package com.vellor.care.domain.model;

import java.time.LocalDate;

public record ComputerSystem(
    String windowsVersion,
    String windowsBuild,
    String officeVersion,
    String antivirus,
    LocalDate lastWindowsUpdate,
    boolean domainJoined
) {}
