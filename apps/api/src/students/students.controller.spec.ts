import { Reflector } from '@nestjs/core';
import { StudentsController } from './students.controller';
import { RoleName } from '../_shared/enums/roles';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('StudentsController (SEC-05 & SEC-06 Regression)', () => {
  const reflector = new Reflector();

  it('should NOT allow RoleName.STUDENT to invoke syncEnrollment (SEC-05)', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      StudentsController.prototype.syncEnrollment,
    );

    expect(roles).toBeDefined();
    expect(roles).not.toContain(RoleName.STUDENT);
  });

  it('should NOT allow RoleName.STUDENT to enumerate all students via findAll (SEC-06)', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      StudentsController.prototype.findAll,
    );

    expect(roles).toBeDefined();
    expect(roles).not.toContain(RoleName.STUDENT);
  });
});
