package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerAssignment;
import com.vellor.care.domain.model.ComputerHardware;
import com.vellor.care.domain.model.ComputerSystem;
import com.vellor.care.domain.model.ComputerWarranty;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.infrastructure.persistence.entity.ComputerEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class ComputerMapper {

    public Computer toDomain(ComputerEntity entity, HealthSnapshot latestHealth) {
        if (entity == null) return null;

        ComputerAssignment assignment = new ComputerAssignment(
            entity.getEmployeeName(),
            entity.getEmployeeEmail(),
            entity.getSectorId(),
            entity.getUnitId(),
            entity.getLocation()
        );

        ComputerHardware hardware = new ComputerHardware(
            entity.getProcessor(),
            entity.getRamGb(),
            entity.getRamDetail(),
            entity.getStorageType(),
            entity.getStorageGb(),
            entity.getStorageDetail(),
            entity.getGpu(),
            entity.getPowerSupply(),
            entity.getMotherboard(),
            entity.getAcquisitionDate()
        );

        ComputerSystem system = new ComputerSystem(
            entity.getWindowsVersion(),
            entity.getWindowsBuild(),
            entity.getOfficeVersion(),
            entity.getAntivirus(),
            entity.getLastWindowsUpdate(),
            entity.isDomainJoined()
        );

        ComputerWarranty warranty = new ComputerWarranty(
            entity.getSupplier(),
            entity.getInvoiceNumber(),
            entity.getWarrantyUntil(),
            entity.getPurchaseValue()
        );

        return new Computer(
            entity.getId(),
            entity.getAssetTag(),
            entity.getHostname(),
            entity.getSerialNumber(),
            entity.getModel(),
            entity.getManufacturer(),
            assignment,
            hardware,
            system,
            warranty,
            entity.getStatus(),
            entity.getNotes(),
            entity.getPhotoUrl(),
            entity.getQrPayload(),
            entity.getLastMaintenanceAt(),
            entity.getNextMaintenanceAt(),
            entity.getMaintenanceIntervalDays(),
            latestHealth,
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public ComputerEntity toEntity(Computer domain) {
        if (domain == null) return null;
        Instant now = Instant.now();

        ComputerAssignment a = domain.assignment();
        ComputerHardware h = domain.hardware();
        ComputerSystem s = domain.system();
        ComputerWarranty w = domain.warranty();

        return ComputerEntity.builder()
            .id(domain.id())
            .assetTag(domain.assetTag())
            .hostname(domain.hostname())
            .serialNumber(domain.serialNumber())
            .model(domain.model())
            .manufacturer(domain.manufacturer())
            .employeeName(a != null ? a.employeeName() : "")
            .employeeEmail(a != null ? a.employeeEmail() : null)
            .sectorId(a != null ? a.sectorId() : null)
            .unitId(a != null ? a.unitId() : null)
            .location(a != null ? a.location() : null)
            .processor(h != null ? h.processor() : "")
            .ramGb(h != null ? h.ramGb() : 0)
            .ramDetail(h != null ? h.ramDetail() : null)
            .storageType(h != null ? h.storageType() : null)
            .storageGb(h != null ? h.storageGb() : 0)
            .storageDetail(h != null ? h.storageDetail() : null)
            .gpu(h != null ? h.gpu() : null)
            .powerSupply(h != null ? h.powerSupply() : null)
            .motherboard(h != null ? h.motherboard() : null)
            .acquisitionDate(h != null ? h.acquisitionDate() : null)
            .windowsVersion(s != null ? s.windowsVersion() : "")
            .windowsBuild(s != null ? s.windowsBuild() : null)
            .officeVersion(s != null ? s.officeVersion() : null)
            .antivirus(s != null ? s.antivirus() : null)
            .lastWindowsUpdate(s != null ? s.lastWindowsUpdate() : null)
            .domainJoined(s != null && s.domainJoined())
            .supplier(w != null ? w.supplier() : null)
            .invoiceNumber(w != null ? w.invoiceNumber() : null)
            .warrantyUntil(w != null ? w.warrantyUntil() : null)
            .purchaseValue(w != null ? w.purchaseValue() : null)
            .status(domain.status())
            .notes(domain.notes())
            .photoUrl(domain.photoUrl())
            .qrPayload(domain.qrPayload())
            .lastMaintenanceAt(domain.lastMaintenanceAt())
            .nextMaintenanceAt(domain.nextMaintenanceAt())
            .maintenanceIntervalDays(domain.maintenanceIntervalDays() > 0 ? domain.maintenanceIntervalDays() : 90)
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();
    }
}
