package com.novabank.banking.service;

import com.novabank.banking.dto.complaint.ComplaintRequest;
import com.novabank.banking.dto.complaint.ComplaintResponse;
import com.novabank.banking.dto.complaint.ComplaintStatusUpdateRequest;

import java.util.List;

public interface ComplaintService {
    ComplaintResponse createComplaint(String username, ComplaintRequest request);
    List<ComplaintResponse> getMyComplaints(String username);
    List<ComplaintResponse> getAllComplaints();
    ComplaintResponse updateComplaintStatus(Long id, ComplaintStatusUpdateRequest request);
}
