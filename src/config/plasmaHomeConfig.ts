// Plasma Home Page Configuration
// This file contains the configuration for the plasma home page setup

export const plasmaHomeConfig = {
  // Current home page route
  currentHomeRoute: "/",
  currentHomeComponent: "HomePage",
  
  // New home page route
  newHomeRoute: "/new-home",
  newHomeComponent: "NewHomePage",
  
  // Navigation settings
  navigation: {
    homeLabel: "Home",
    newHomeLabel: "New Home",
    homeIcon: "Home",
    newHomeIcon: "Home",
  },
  
  // Routing configuration
  routes: {
    home: {
      path: "/",
      component: "HomePage",
      label: "Home",
      isActive: true,
      isDefault: true
    },
    newHome: {
      path: "/new-home", 
      component: "NewHomePage",
      label: "New Home",
      isActive: false,
      isDefault: false
    }
  },
  
  // Component imports
  components: {
    HomePage: "import HomePage from './pages/HomePage';",
    NewHomePage: "import NewHomePage from './pages/NewHomePage';"
  },
  
  // AI Assistant configuration
  aiAssistant: {
    homePage: {
      name: 'Home',
      icon: 'Home',
      description: 'Main landing page'
    },
    newHomePage: {
      name: 'New Home', 
      icon: 'Home',
      description: 'Enhanced landing page'
    }
  }
};

// Export the configuration for use in other files
export default plasmaHomeConfig; 