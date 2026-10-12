import { registerDecorator, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isKebabCase', async: false })
export class IsKebabCase implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} harus slug lowercase kebab-case (huruf, angka, tanda hubung).`;
  }
}

export function ValidateSlug(validationArgs?: { message?: string }) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: { message: validationArgs?.message },
      constraints: [],
      validator: IsKebabCase,
    });
  };
}
