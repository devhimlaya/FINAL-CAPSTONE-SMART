# SMART ERD Cardinality Notes

This file separates real schema problems from valid nullable fields so the ERD stays honest.

## What `String?` Actually Means

`String?` in Prisma means the field is optional, not automatically incorrect.

There are three different cases in this schema:

1. Valid optional business data.
Examples: `Student.middleName`, `Student.suffix`, `SystemSettings.address`, `Subject.description`.

2. Valid optional process data.
Examples: `Grade.remarks`, `Grade.quarterlyGrade`, `ExcelTemplate.instructions`, `ECRTemplate.subjectType`.

3. Fields that should behave like relationships.
Examples: `Teacher.userId`, `Section.adviserId`, `ClassAssignment.teacherId`, `ExcelTemplate.uploadedBy`, `ECRTemplate.uploadedBy`, `AuditLog.userId`.

## Cardinality Already Enforced in Schema

The following are now explicit Prisma relationships and should appear as real ERD links:

1. `User` 1:1 `Teacher`
2. `Teacher` 1:N `Section` via `Section.adviserId`
3. `Teacher` 1:N `ClassAssignment`
4. `Subject` 1:N `ClassAssignment`
5. `Section` 1:N `ClassAssignment`
6. `Student` 1:N `Enrollment`
7. `Section` 1:N `Enrollment`
8. `Student` 1:N `Grade`
9. `ClassAssignment` 1:N `Grade`
10. `Student` 1:N `Attendance`
11. `Section` 1:N `Attendance`
12. `User` 1:N `ExcelTemplate`
13. `User` 1:N `ECRTemplate`
14. `User` 1:N `AuditLog` as an optional historical link

## Fields Intentionally Left Loose for Now

These fields should not be drawn as strict foreign keys in the ERD yet:

1. `Attendance.recordedBy`
Reason: current code stores `Teacher.id` when available, otherwise `User.id`. That makes it a mixed-reference field, not a clean single FK.

2. `AuditLog.targetId`
Reason: this is polymorphic. It can point to many entity types depending on `targetType`.

3. `uploadedByName`, `userName`, `userRole`
Reason: these are denormalized display/history fields, not relationship keys.

## Recommendation for ERD Drawing

Use two rules:

1. Draw hard cardinality lines only for Prisma `@relation` fields.
2. Show mixed-reference or polymorphic fields as plain attributes with a note, not as FK lines.

## If You Want a Stricter Future Schema

The next cleanup candidate is `Attendance.recordedBy`.

Recommended redesign:

1. Replace `recordedBy String?`
2. Add `recordedByUserId String?`
3. Add an optional relation to `User`
4. Keep display name separately if historical retention is important

That change would make attendance ownership clean for ERD and reporting.