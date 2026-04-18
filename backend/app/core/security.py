"""Security helpers for password hashing and token generation."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from app.core.config import settings

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def _encode_bytes(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _decode_bytes(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _normalize_password(password: str) -> bytes:
    return f"{password}{settings.password_pepper}".encode("utf-8")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        _normalize_password(password),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return (
        f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}$"
        f"{_encode_bytes(salt)}${_encode_bytes(digest)}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, n, r, p, salt_b64, digest_b64 = stored_hash.split("$")
        if algorithm != "scrypt":
            return False

        expected_digest = hashlib.scrypt(
            _normalize_password(password),
            salt=_decode_bytes(salt_b64),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(_decode_bytes(digest_b64)),
        )
        return hmac.compare_digest(expected_digest, _decode_bytes(digest_b64))
    except (TypeError, ValueError):
        return False


def generate_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
