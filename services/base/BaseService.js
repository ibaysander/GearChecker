class BaseService {
    constructor() {
        if (this.constructor === BaseService) {
            throw new Error('Abstract class cannot be instantiated');
        }
    }

    async validate(data) {
        throw new Error('Method not implemented');
    }

    async execute(data) {
        throw new Error('Method not implemented');
    }
}

module.exports = BaseService; 