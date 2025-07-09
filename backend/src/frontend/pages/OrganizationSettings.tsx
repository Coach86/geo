import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrganizationList from './OrganizationList';

const OrganizationSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle legacy URL with filter parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const filterOrgId = urlParams.get('filter');
    
    if (filterOrgId) {
      // Redirect to the specific organization details page
      navigate(`/organization/${filterOrgId}`);
      return;
    }
  }, [location.search, navigate]);

  // For now, just render the OrganizationList component
  return <OrganizationList />;
};

export default OrganizationSettings;
