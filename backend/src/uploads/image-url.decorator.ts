import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Covers legacy wall uploads, product uploads, SiteImage uploads, and any future namespace.
export const UPLOAD_PATH_REGEX =
  /^\/api\/(photos|products|site-images)\/uploads\/[^/]+\.(jpg|jpeg|png|gif)$/i;

@ValidatorConstraint({ async: false })
export class IsImageUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // Accept external references (existing manual URL behavior) and local
    // upload paths served by this application.
    return /^https?:\/\//i.test(value) || UPLOAD_PATH_REGEX.test(value);
  }
}

export function IsImageUrl(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsImageUrlConstraint,
    });
  };
}