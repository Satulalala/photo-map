package com.photomap.sync;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@RequestBody AuthDtos.RegisterRequest req) {
        AuthDtos.AuthResponse result = authService.register(req.email, req.password);
        if (!result.ok) {
            return ResponseEntity.status(409).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(@RequestBody AuthDtos.LoginRequest req) {
        AuthDtos.AuthResponse result = authService.login(req.email, req.password);
        if (!result.ok) {
            return ResponseEntity.status(401).body(result);
        }
        return ResponseEntity.ok(result);
    }
}
