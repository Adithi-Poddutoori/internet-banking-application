package com.novabank.banking.dto.nominee;

import com.novabank.banking.enums.GovtIdType;
import com.novabank.banking.enums.Relation;

public record NomineeResponse(
        Long id,
        String name,
        String govtId,
        GovtIdType govtIdType,
        String phoneNo,
        Relation relation
) {
}
