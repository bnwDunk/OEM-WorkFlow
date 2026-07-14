export type ConfigSection = 'flows' | 'statuses' | 'customers' | 'tags' | 'users' | 'departments'

export const configSectionOptions: { description: string; label: string; value: ConfigSection }[] = [
  { description: 'Workflow templates and phase structure', label: 'Flow Management', value: 'flows' },
  { description: 'Customer status dropdown values', label: 'Customer Statuses', value: 'statuses' },
  { description: 'Customer codes and project records', label: 'Customers', value: 'customers' },
  { description: 'Tag labels and colors', label: 'Tags', value: 'tags' },
  { description: 'User access and department assignment', label: 'Users', value: 'users' },
  { description: 'Department ownership and members', label: 'Departments', value: 'departments' },
]
