package com.vellor.care.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ComputerWarranty(
    String supplier,
    String invoiceNumber,
    LocalDate warrantyUntil,
    BigDecimal purchaseValue
) {}
