/**
 * ACCESS NATURE - FORM VALIDATION HELPER
 * Provides client-side form validation with inline error messages
 */

class FormValidator {
  constructor(form) {
    this.form = form;
    this.errors = {};
  }

  /**
   * Validate a single field
   * @param {HTMLInputElement} field - Form field element
   * @param {Array} rules - Validation rules
   * @returns {boolean} - True if valid
   */
  validateField(field, rules) {
    const value = field.value.trim();
    let error = null;

    for (const rule of rules) {
      if (rule.required && !value) {
        error = rule.message || 'This field is required';
        break;
      }

      if (rule.minLength && value.length < rule.minLength) {
        error = rule.message || `Minimum length is ${rule.minLength} characters`;
        break;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        error = rule.message || `Maximum length is ${rule.maxLength} characters`;
        break;
      }

      if (rule.email && value && !this.isValidEmail(value)) {
        error = rule.message || 'Please enter a valid email address';
        break;
      }

      if (rule.pattern && value && !rule.pattern.test(value)) {
        error = rule.message || 'Invalid format';
        break;
      }

      if (rule.custom && !rule.custom(value, field)) {
        error = rule.message || 'Invalid value';
        break;
      }
    }

    if (error) {
      this.showError(field, error);
      this.errors[field.name] = error;
      return false;
    } else {
      this.clearError(field);
      delete this.errors[field.name];
      return true;
    }
  }

  /**
   * Show error message for a field
   */
  showError(field, message) {
    field.classList.add('error');
    
    let errorEl = field.parentElement.querySelector('.form-error-message');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error-message';
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  /**
   * Clear error message for a field
   */
  clearError(field) {
    field.classList.remove('error');
    
    const errorEl = field.parentElement.querySelector('.form-error-message');
    if (errorEl) {
      errorEl.remove();
    }
  }

  /**
   * Validate entire form
   * @param {Object} validationRules - Object mapping field names to validation rules
   * @returns {boolean} - True if all fields are valid
   */
  validateForm(validationRules) {
    this.errors = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(validationRules)) {
      const field = this.form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        if (!this.validateField(field, rules)) {
          isValid = false;
        }
      }
    }

    return isValid;
  }

  /**
   * Enable real-time validation for a field
   */
  enableRealtimeValidation(field, rules) {
    field.addEventListener('blur', () => {
      this.validateField(field, rules);
    });

    field.addEventListener('input', () => {
      if (field.classList.contains('error')) {
        this.validateField(field, rules);
      }
    });
  }

  /**
   * Email validation helper
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get all validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Check if form has errors
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    this.form.querySelectorAll('.error').forEach(field => {
      this.clearError(field);
    });
    this.errors = {};
  }
}

// Helper function to create validator for a form
window.createFormValidator = function(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) {
    console.error(`Form not found: ${formSelector}`);
    return null;
  }
  return new FormValidator(form);
};

// Usage example (commented out):
// const validator = createFormValidator('#myForm');
// 
// // Validate on submit
// form.addEventListener('submit', (e) => {
//   e.preventDefault();
//   
//   const isValid = validator.validateForm({
//     email: [
//       { required: true, message: 'Email is required' },
//       { email: true, message: 'Please enter a valid email' }
//     ],
//     password: [
//       { required: true, message: 'Password is required' },
//       { minLength: 8, message: 'Password must be at least 8 characters' }
//     ],
//     name: [
//       { required: true },
//       { minLength: 2, maxLength: 50 }
//     ]
//   });
//   
//   if (isValid) {
//     // Submit form
//   }
// });
// 
// // Real-time validation for a field
// const emailField = form.querySelector('[name="email"]');
// validator.enableRealtimeValidation(emailField, [
//   { required: true },
//   { email: true }
// ]);
