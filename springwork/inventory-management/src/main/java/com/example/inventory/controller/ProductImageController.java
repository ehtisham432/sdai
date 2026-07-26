package com.example.inventory.controller;

import com.example.inventory.ProductImage;
import com.example.inventory.repository.ProductImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/product-images")
public class ProductImageController {
    @Autowired
    private ProductImageRepository productImageRepository;

    @GetMapping
    public List<ProductImage> getAllImages() {
        return productImageRepository.findAll();
    }

    @GetMapping("/{id}")
    public ProductImage getImage(@PathVariable Long id) {
        return productImageRepository.findById(id).orElse(null);
    }

    @PostMapping
    public ProductImage createImage(@RequestBody ProductImage image) {
        return productImageRepository.save(image);
    }

    @PutMapping("/{id}")
    public ProductImage updateImage(@PathVariable Long id, @RequestBody ProductImage image) {
        image.setId(id);
        return productImageRepository.save(image);
    }

    @DeleteMapping("/{id}")
    public void deleteImage(@PathVariable Long id) {
        productImageRepository.deleteById(id);
    }
}
