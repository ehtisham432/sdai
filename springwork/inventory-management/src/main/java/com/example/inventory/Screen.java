package com.example.inventory;

import jakarta.persistence.*;

@Entity
public class Screen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String path; // UI route or identifier

    private String description;

    @ManyToOne
    @JoinColumn(name = "group_id")
    private ScreenGroup group;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ScreenGroup getGroup() { return group; }
    public void setGroup(ScreenGroup group) { this.group = group; }
}