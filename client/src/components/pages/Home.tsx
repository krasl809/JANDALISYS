import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../layout/Dashboard';
import ContractList from '../contracts/ContractList';
import ContractForm from '../contracts/ContractForm';
import PrivateRoute from '../auth/PrivateRoute';

const Home: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      
      <Route path="/contracts" element={
        <PrivateRoute>
          <ContractList />
        </PrivateRoute>
      } />
      
      <Route path="/contracts/new" element={
        <PrivateRoute>
          <ContractForm />
        </PrivateRoute>
      } />
      
      <Route path="/contracts/:id/edit" element={
        <PrivateRoute>
          <ContractForm />
        </PrivateRoute>
      } />
    </Routes>
  );
};

export default Home;