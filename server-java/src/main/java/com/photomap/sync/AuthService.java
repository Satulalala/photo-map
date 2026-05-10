package com.photomap.sync;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthDtos.AuthResponse register(String email, String password) {
        if (userRepository.existsByEmail(email)) {
            return AuthDtos.AuthResponse.fail("邮箱已被注册", false);
        }

        User user = new User(email, passwordEncoder.encode(password));
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.id, user.email);
        AuthDtos.UserInfo userInfo = new AuthDtos.UserInfo(user.id, user.email, user.username);
        return AuthDtos.AuthResponse.success(token, userInfo);
    }

    public AuthDtos.AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.passwordHash)) {
            return AuthDtos.AuthResponse.fail("邮箱或密码错误", false);
        }

        String token = jwtUtil.generateToken(user.id, user.email);
        AuthDtos.UserInfo userInfo = new AuthDtos.UserInfo(user.id, user.email, user.username);
        return AuthDtos.AuthResponse.success(token, userInfo);
    }
}
