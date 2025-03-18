class ApplicationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends ApplicationError {
    constructor(message, details = {}) {
        super(message, 'VALIDATION_ERROR', details);
    }
}

class CharacterNotFoundError extends ApplicationError {
    constructor(name, realm) {
        super(
            `Character ${name} not found in realm ${realm}`,
            'CHARACTER_NOT_FOUND',
            { name, realm }
        );
    }
}

class ArmoryError extends ApplicationError {
    constructor(message, details = {}) {
        super(message, 'ARMORY_ERROR', details);
    }
}

module.exports = {
    ApplicationError,
    ValidationError,
    CharacterNotFoundError,
    ArmoryError
}; 