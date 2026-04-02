package com.example.inventory.service;

import com.example.inventory.Company;
import com.example.inventory.Customer;
import com.example.inventory.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CustomerService {
    
    @Autowired
    private CustomerRepository customerRepository;
    
    public Customer createCustomer(Customer customer) {
        customer.setCreatedAt(new Date());
        customer.setUpdatedAt(new Date());
        return customerRepository.save(customer);
    }
    
    public Optional<Customer> getCustomerById(Long id) {
        return customerRepository.findById(id);
    }
    
    public List<Customer> getCustomersByCompany(Long companyId) {
        return customerRepository.findByCompanyId(companyId);
    }
    
    public List<Customer> searchCustomers(Long companyId, String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getCustomersByCompany(companyId);
        }
        return customerRepository.findByCompanyIdAndNameContainingIgnoreCase(companyId, searchTerm);
    }
    
    public Customer updateCustomer(Long id, Customer updatedCustomer) {
        Optional<Customer> existing = customerRepository.findById(id);
        if (existing.isPresent()) {
            Customer customer = existing.get();
            customer.setName(updatedCustomer.getName());
            customer.setEmail(updatedCustomer.getEmail());
            customer.setPhone(updatedCustomer.getPhone());
            customer.setAddress(updatedCustomer.getAddress());
            customer.setCity(updatedCustomer.getCity());
            customer.setState(updatedCustomer.getState());
            customer.setZipCode(updatedCustomer.getZipCode());
            customer.setCountry(updatedCustomer.getCountry());
            customer.setNotes(updatedCustomer.getNotes());
            customer.setUpdatedAt(new Date());
            return customerRepository.save(customer);
        }
        return null;
    }
    
    public boolean deleteCustomer(Long id) {
        if (customerRepository.existsById(id)) {
            customerRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    public Customer getOrCreateCounterSaleCustomer(Company company) {
        Customer counterSale = customerRepository.findByCompanyIdAndName(company.getId(), "Counter Sale");
        if (counterSale == null) {
            counterSale = new Customer("Counter Sale", company);
            counterSale = createCustomer(counterSale);
        }
        return counterSale;
    }
}
