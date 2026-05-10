package com.photomap.sync;

public class AuthDtos {

    public static class RegisterRequest {
        public String email;
        public String password;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class AuthResponse {
        public boolean ok;
        public String token;
        public UserInfo user;
        public String error;

        public static AuthResponse success(String token, UserInfo user) {
            AuthResponse r = new AuthResponse();
            r.ok = true;
            r.token = token;
            r.user = user;
            return r;
        }

        public static AuthResponse fail(String error, boolean ok) {
            AuthResponse r = new AuthResponse();
            r.ok = ok;
            r.error = error;
            return r;
        }
    }

    public static class UserInfo {
        public Long id;
        public String email;
        public String username;

        public UserInfo(Long id, String email, String username) {
            this.id = id;
            this.email = email;
            this.username = username;
        }
    }
}
