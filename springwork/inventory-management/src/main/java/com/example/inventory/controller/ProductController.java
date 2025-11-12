package com.example.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import com.example.inventory.Product;
import com.example.inventory.ProductImage;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.ProductImageRepository;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/products")
public class ProductController {
    private static final Logger logger = LoggerFactory.getLogger(ProductController.class);
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @GetMapping
    public List<ProductDTO> getAllProducts(@RequestParam(required = false) Long companyId) {
        List<Product> products = productRepository.findAll();
        if (companyId != null) {
            products = products.stream()
                .filter(p -> p.getCompany() != null && p.getCompany().getId().equals(companyId))
                .toList();
        }
        return products.stream().map(ProductDTO::fromProduct).toList();
    }

    public static class ProductDTO {
        public Long id;
        public String name;
        public String description;
        public Double price;
        public Object company;
        public String titleImageUrl;
        public static ProductDTO fromProduct(Product p) {
            ProductDTO dto = new ProductDTO();
            dto.id = p.getId();
            dto.name = p.getName();
            dto.description = p.getDescription();
            dto.price = p.getPrice();
            dto.company = p.getCompany();
            dto.titleImageUrl = (p.getTitleImage() != null) ? p.getTitleImage().getUrl() : null;
            return dto;
        }
    }

    @PostMapping
    public ResponseEntity<?> createProduct(
            @RequestPart("product") Product product,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            @RequestParam(value = "titleImageIdx", required = false) Integer titleImageIdx) {
        // Save images to folder and set URLs
        if (images != null && images.length > 0) {
            java.util.List<ProductImage> productImages = new java.util.ArrayList<>();
            String uploadDir = System.getProperty("user.dir") + "/uploads/product-images/";
            java.io.File dir = new java.io.File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            for (int i = 0; i < images.length; i++) {
                MultipartFile file = images[i];
                String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir, filename);
                try {
                    file.transferTo(filePath);
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Image upload failed");
                }
                ProductImage img = new ProductImage();
                img.setUrl("/uploads/product-images/" + filename);
                img.setTitleImage(titleImageIdx != null && i == titleImageIdx);
                img.setProduct(product);
                productImages.add(img);
                if (img.isTitleImage()) product.setTitleImage(img);
            }
            product.setImages(productImages);
        }
        Product saved = productRepository.save(product);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        Product p = productRepository.findById(id).orElse(null);
        if (p != null) {
            // Ensure images collection is initialized so JSON includes saved images in edit scenarios
            try {
                if (p.getImages() != null) p.getImages().size();
            } catch (Exception ignored) {}
            // Ensure titleImage reference is initialized
            try {
                if (p.getTitleImage() != null) p.getTitleImage().getId();
            } catch (Exception ignored) {}
            try {
                logger.info("getProduct id={} imagesCount={}", id, p.getImages() == null ? 0 : p.getImages().size());
            } catch (Exception ignored) {}
        }
        return p;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @RequestPart("product") Product product,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            @RequestParam(value = "titleImageIdx", required = false) Integer titleImageIdx,
            @RequestParam(value = "titleImageId", required = false) Long titleImageId) {
        product.setId(id);

        // If no new images are uploaded but client provided titleImageId, update existing images' title flag
        if ((images == null || images.length == 0) && titleImageId != null) {
            Product existing = productRepository.findById(id).orElse(null);
            if (existing == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Product not found");

            java.util.List<ProductImage> imgs = existing.getImages() != null ? new java.util.ArrayList<>(existing.getImages()) : new java.util.ArrayList<>();
            ProductImage chosen = null;
            for (ProductImage pi : imgs) {
                boolean isTitle = (pi.getId() != null && pi.getId().equals(titleImageId));
                pi.setTitleImage(isTitle);
                if (isTitle) chosen = pi;
            }
            product.setImages(imgs);
            product.setTitleImage(chosen);
            Product saved = productRepository.save(product);
            return ResponseEntity.ok(saved);
        }

        // If new images are uploaded, replace images with newly uploaded ones (existing behavior)
        if (images != null && images.length > 0) {
            java.util.List<ProductImage> productImages = new java.util.ArrayList<>();
            String uploadDir = System.getProperty("user.dir") + "/uploads/product-images/";
            java.io.File dir = new java.io.File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            for (int i = 0; i < images.length; i++) {
                MultipartFile file = images[i];
                String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir, filename);
                try {
                    file.transferTo(filePath);
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Image upload failed");
                }
                ProductImage img = new ProductImage();
                img.setUrl("/uploads/product-images/" + filename);
                img.setTitleImage(titleImageIdx != null && i == titleImageIdx);
                img.setProduct(product);
                productImages.add(img);
                if (img.isTitleImage()) product.setTitleImage(img);
            }
            product.setImages(productImages);
        }
        Product saved = productRepository.save(product);
        return ResponseEntity.ok(saved);
    }

    // Support JSON PUT requests when no files are uploaded (avoid multipart parsing issues from some clients)
    @PutMapping(path = "/{id}", consumes = "application/json")
    public ResponseEntity<?> updateProductJson(
            @PathVariable Long id,
            @RequestBody Product product,
            @RequestParam(value = "titleImageId", required = false) Long titleImageId) {
        product.setId(id);
        // only handle title image change when client sends JSON (no files)
        if (titleImageId != null) {
            Product existing = productRepository.findById(id).orElse(null);
            if (existing == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Product not found");
            java.util.List<ProductImage> imgs = existing.getImages() != null ? new java.util.ArrayList<>(existing.getImages()) : new java.util.ArrayList<>();
            ProductImage chosen = null;
            for (ProductImage pi : imgs) {
                boolean isTitle = (pi.getId() != null && pi.getId().equals(titleImageId));
                pi.setTitleImage(isTitle);
                if (isTitle) chosen = pi;
            }
            product.setImages(imgs);
            product.setTitleImage(chosen);
            Product saved = productRepository.save(product);
            return ResponseEntity.ok(saved);
        }
        // otherwise just save product fields (no image changes)
        Product saved = productRepository.save(product);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productRepository.deleteById(id);
    }
}
