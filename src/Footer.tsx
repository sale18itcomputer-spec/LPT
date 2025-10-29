import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary-bg dark:bg-dark-secondary-bg border-t border-border-color dark:border-dark-border-color mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-secondary-text dark:text-dark-secondary-text">
          <p>&copy; {currentYear} Limperial Technology Co, Ltd. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-primary-text dark:hover:text-dark-primary-text transition-colors">Privacy Policy</a>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <a href="#" className="hover:text-primary-text dark:hover:text-dark-primary-text transition-colors">Terms of Service</a>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
