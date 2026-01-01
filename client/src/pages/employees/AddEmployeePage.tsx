import React from 'react';
import EmployeeForm from '../../components/employees/EmployeeForm';

const AddEmployeePage: React.FC = () => {
  return (
    <EmployeeForm 
      mode="create"
    />
  );
};

export default AddEmployeePage;