package com.example.inventory;

import jakarta.persistence.*;

@Entity
@Table(name = "role_screens", uniqueConstraints = @UniqueConstraint(columnNames = {"role_id", "screen_id"}))
public class RoleScreen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_id")
    private Role role;

    @ManyToOne(optional = false)
    @JoinColumn(name = "screen_id")
    private Screen screen;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Screen getScreen() { return screen; }
    public void setScreen(Screen screen) { this.screen = screen; }
}