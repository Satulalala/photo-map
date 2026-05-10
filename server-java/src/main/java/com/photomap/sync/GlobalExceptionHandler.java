package com.photomap.sync;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AuthDtos.AuthResponse> handleException(Exception e) {
        AuthDtos.AuthResponse response = AuthDtos.AuthResponse.fail("服务器内部错误", false);
        return ResponseEntity.status(500).body(response);
    }
}
