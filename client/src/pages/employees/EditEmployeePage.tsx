import React from 'react';
import { useParams } from 'react-router-dom';
import EmployeeForm from '../../components/employees/EmployeeForm';

const EditEmployeePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <EmployeeForm 
      mode="edit"
    />
  );
};

export default EditEmployeePage;