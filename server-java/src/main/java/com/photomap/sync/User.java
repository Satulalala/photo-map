package com.photomap.sync;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true, nullable = false)
    public String email;

    @Column(nullable = false)
    public String passwordHash;

    public String username;

    public Instant createdAt;

    public User() {}

    public User(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.username = email.split("@")[0];
        this.createdAt = Instant.now();
    }
}
