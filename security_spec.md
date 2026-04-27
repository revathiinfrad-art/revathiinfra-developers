# Security Spec: Revathi Infra Portal

## Data Invariants
1. Only authorized employees (listed in 'employees' collection) can access project details.
2. Only admins can create or delete projects and employees.
3. Both admins and staff can update plot statuses.
4. Plot updates must include a timestamp and the employee ID of the updater.
5. Deleting a project is restricted to admins only.
6. Employee profiles are immutable by the employees themselves (managed by admins).

## The Dirty Dozen (Test Payloads)
1. **Unauthorized Delete**: Try deleting a project as an unauthenticated user.
2. **Unauthorized Plot Update**: Try marking a plot as SOLD without being in the employees collection.
3. **Identity Spoofing**: Try updating a plot but setting `updatedBy` to a different employee's ID.
4. **State Skip**: Try updating a plot status directly to 'Sold' without providing customer details (if enforced).
5. **Over-writing Admin**: A staff member tries to update their own role to 'admin'.
6. **Project Poisoning**: Try creating a project with a 2MB description string.
7. **Orphaned Plot**: Try creating a plot that points to a non-existent projectId.
8. **PII Leak**: An unauthenticated user tries to read the `private` subcollection of an employee.
9. **Bulk Plot Sweep**: An authenticated user tries to list all plots across all projects in one query without filter.
10. **Timestamp Fraud**: Try setting a `updatedAt` in the past instead of using request.time.
11. **Shadow Field**: Try adding an `isVerified: true` field to a project document that isn't in the schema.
12. **Id Poisoning**: Try creating an employee with an ID containing malicious characters.
