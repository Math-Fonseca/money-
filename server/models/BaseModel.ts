/**
 * Base Model Class
 * Provides common functionality for all models including validation and data transformation
 */
export abstract class BaseModel {
  protected id?: string;
  protected createdAt?: Date;
  protected updatedAt?: Date;

  constructor(data: any = {}) {
    this.id = data.id;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : undefined;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined;
  }

  /**
   * Get the ID of the model
   */
  getId(): string | undefined {
    return this.id;
  }

  /**
   * Set the ID of the model
   */
  setId(id: string): void {
    this.id = id;
  }

  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  /**
   * Get last update timestamp
   */
  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  /**
   * Update the updatedAt timestamp
   */
  touch(): void {
    this.updatedAt = new Date();
  }

  /**
   * Convert model to plain object for database storage
   */
  abstract toData(): Record<string, any>;

  /**
   * Validate model data
   */
  abstract validate(): { isValid: boolean; errors: string[] };

  /**
   * Convert model to JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
      ...this.toData()
    };
  }
}