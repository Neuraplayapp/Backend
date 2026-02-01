import React, { useEffect } from 'react';

const DashboardScript: React.FC = () => {
  useEffect(() => {
    // Sidebar toggle functionality
    const showAsideBtn = document.querySelector('.show-side-btn');
    const sidebar = document.querySelector('.sidebar');
    const wrapper = document.getElementById('wrapper');

    const handleSidebarToggle = () => {
      if (sidebar && wrapper) {
        sidebar.classList.toggle('show-sidebar');
        wrapper.classList.toggle('fullwidth');
      }
    };

    if (showAsideBtn) {
      showAsideBtn.addEventListener('click', handleSidebarToggle);
    }

    // Mobile sidebar behavior
    if (window.innerWidth < 767 && sidebar) {
      sidebar.classList.add('show-sidebar');
    }

    const handleResize = () => {
      if (window.innerWidth > 767 && sidebar) {
        sidebar.classList.remove('show-sidebar');
      }
    };

    window.addEventListener('resize', handleResize);

    // Dropdown menu functionality
    const categories = document.querySelector('.categories');
    
    const handleDropdownClick = (event: Event) => {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const item = target.closest('.has-dropdown');

      if (!item) {
        return;
      }

      item.classList.toggle('opened');

      // Close other dropdowns
      const siblings = Array.from(item.parentNode?.children || []).filter(
        (sibling) => sibling !== item
      );

      siblings.forEach((sibling) => {
        sibling.classList.remove('opened');
      });

      if (item.classList.contains('opened')) {
        const toOpen = item.querySelector('.sidebar-dropdown');
        if (toOpen) {
          toOpen.classList.add('active');
        }

        siblings.forEach((sibling) => {
          const toClose = sibling.querySelector('.sidebar-dropdown');
          if (toClose) {
            toClose.classList.remove('active');
          }
        });
      } else {
        const dropdown = item.querySelector('.sidebar-dropdown');
        if (dropdown) {
          dropdown.classList.toggle('active');
        }
      }
    };

    if (categories) {
      categories.addEventListener('click', handleDropdownClick);
    }

    // Close sidebar button
    const closeAside = document.querySelector('.close-aside');
    
    const handleCloseAside = () => {
      if (sidebar && wrapper) {
        sidebar.classList.add('show-sidebar');
        wrapper.classList.remove('margin');
      }
    };

    if (closeAside) {
      closeAside.addEventListener('click', handleCloseAside);
    }

    // Cleanup function
    return () => {
      if (showAsideBtn) {
        showAsideBtn.removeEventListener('click', handleSidebarToggle);
      }
      if (categories) {
        categories.removeEventListener('click', handleDropdownClick);
      }
      if (closeAside) {
        closeAside.removeEventListener('click', handleCloseAside);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default DashboardScript; 