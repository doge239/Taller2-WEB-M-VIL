from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegistroUsuario(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        nombre = value.strip()
        if not nombre:
            raise ValueError("El nombre no puede estar vacío")
        return nombre

    @field_validator("correo")
    @classmethod
    def normalizar_correo(cls, value: str) -> str:
        return value.strip().lower()


class CredencialesUsuario(BaseModel):
    correo: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("correo")
    @classmethod
    def normalizar_correo(cls, value: str) -> str:
        return value.strip().lower()


class UsuarioPublico(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: EmailStr


class TokenUsuario(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioPublico
