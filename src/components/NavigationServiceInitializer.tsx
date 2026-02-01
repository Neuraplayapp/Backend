/**
 * NavigationServiceInitializer
 * 
 * This component initializes the NavigationService with React Router's navigate function.
 * It must be rendered within a React Router context to work properly.
 * 
 * This enables AI-driven navigation commands like "go to the home page" to work correctly.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavigationService } from '../services/NavigationService';

const NavigationServiceInitializer: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Set the navigate function on the NavigationService singleton
    const navigationService = NavigationService.getInstance();
    navigationService.setNavigate(navigate);
    
    console.log('✅ NavigationServiceInitializer: Navigate function set on NavigationService');
    
    // No cleanup needed - the navigate function persists
  }, [navigate]);
  
  // This component renders nothing - it just initializes the service
  return null;
};

export default NavigationServiceInitializer;




