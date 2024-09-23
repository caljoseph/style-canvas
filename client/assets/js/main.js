(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  mobileNavToggleBtn.addEventListener('click', mobileNavToogle);

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });

  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Initiate Pure Counter
   */
  new PureCounter();

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
          swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });

  });

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll('.navmenu a');

  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  document.addEventListener('scroll', navmenuScrollspy);

})();

/**
 * Profile dropdown functionality
 */
const profilePic = document.getElementById('profile-pic');
const profileDropdown = document.getElementById('profile-dropdown');

if (profilePic) {
  profilePic.addEventListener('click', function() {
    profileDropdown.classList.toggle('show');
  });

  // Close the dropdown if the user clicks outside of it
  window.addEventListener('click', function(event) {
    if (!profilePic.contains(event.target) && !profileDropdown.contains(event.target)) {
      profileDropdown.classList.remove('show');
    }
  });
}

/**
 * Authenticated Fetch Function
 */
async function authFetch(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  if (!options.headers) {
    options.headers = {};
  }
  // Include the access token in the Authorization header
  options.headers['Authorization'] = `Bearer ${accessToken}`;

  let response = await fetch(url, options);

  if (response.status === 401 || !accessToken) {
    // Access token might have expired, try to refresh it
    console.log("trying to refresh accessToken")
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Update the access token in localStorage
      localStorage.setItem('accessToken', newAccessToken);
      // Retry the original request with new access token
      options.headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(url, options);
    } else {
      // Refresh token failed, redirect to login
      logoutUser();
      window.location.href = './registration.html';
      return;
    }
  }
  return response;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await fetch(getApiUrl('/auth/refresh-token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.accessToken;
    } else {
      // Remove invalid refresh token and cognitoId
      localStorage.removeItem('refreshToken');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Any other cleanup actions if necessary
}


/**
 * Update the UI based on user info
 */
document.addEventListener('DOMContentLoaded', async function() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const getStartedBtn = document.getElementById('get-started-btn');
  const userProfile = document.getElementById('user-profile');
  const userName = document.getElementById('user-name');
  const userTokens = document.getElementById('user-credits');
  const logoutBtn = document.getElementById('logout-btn');
  const profilePicElement = document.getElementById('profile-pic');

  // Initialize the profile pic content to prevent 'U' from appearing
  if (profilePicElement) profilePicElement.textContent = '';

  // Refresh token logic
  if (!accessToken && refreshToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Update the access token in localStorage
      localStorage.setItem('accessToken', newAccessToken);
    } else {
      // Refresh token failed, redirect to login
      logoutUser();
      window.location.href = './registration.html';
      return;
    }
  }
  // Update UI based on login status
  if (accessToken) {
    // User is logged in
    if (getStartedBtn) getStartedBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'flex';

    // Fetch user info
    try {
      const response = await authFetch(AppConfig.getApiUrl('/users/profile'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Safely access email and generate initials
        if (data.email && data.email.length >= 2) {
          const firstTwoLetters = data.email.charAt(0).toUpperCase() + data.email.charAt(1).toLowerCase();
          if (profilePicElement) profilePicElement.textContent = firstTwoLetters;
        } else {
          // If email is not available or too short, use a default placeholder
          if (profilePicElement) profilePicElement.textContent = ''; // or set to a default icon
        }

        // Set the text of the user's info
        if (userName) userName.textContent = data.name || data.email || 'User';

        // Parse the user's subscription
        const subscriptionType = data.subscriptionType; // e.g., 'standard_monthly', 'none', etc.

        let subscriptionDisplayText;
        if (subscriptionType === 'none') {
          subscriptionDisplayText = 'not subscribed';
        } else if (subscriptionType === 'standard_monthly') {
          subscriptionDisplayText = 'standard subscription';
        } else if (subscriptionType === 'premium_monthly') {
          subscriptionDisplayText = 'premium subscription';
        } else if (subscriptionType === 'pro_monthly') {
          subscriptionDisplayText = 'pro subscription';
        } else {
          subscriptionDisplayText = 'unknown subscription type';
        }

        if (userTokens) {
          userTokens.innerHTML = `${data.tokens} Credits (${subscriptionDisplayText})<br> <span>Buy Credits or Manage Subscription</span>`;
        }

        // Update the pricing plans based on subscription status
        const plans = document.querySelectorAll('.pricing-item');

        if (subscriptionType && subscriptionType !== 'none') {
          plans.forEach(plan => {
            const buyBtn = plan.querySelector('.buy-btn');
            const planLookupKey = buyBtn.getAttribute('data-lookup-key');

            if (subscriptionType === planLookupKey) {
              // This is the user's current subscription plan
              plan.classList.add('current-plan'); // Add a class to highlight the plan
              buyBtn.textContent = 'Cancel Subscription';
              buyBtn.setAttribute('data-action', 'cancel');
            } else if (buyBtn.getAttribute('data-type') === 'subscription') {
              // Other subscription plans
              plan.classList.add('other-plan');
              buyBtn.textContent = 'Update Subscription';
              buyBtn.setAttribute('data-action', 'update');
            } else {
              // Non-subscription plans (e.g., one-time purchases)
              buyBtn.textContent = 'Buy Now';
              buyBtn.setAttribute('data-action', 'buy');
            }
          });
        } else {
          // User is not subscribed
          // The plans should display 'Buy Now' and proceed with the normal purchase flow
          plans.forEach(plan => {
            const buyBtn = plan.querySelector('.buy-btn');
            buyBtn.textContent = 'Buy Now';
            buyBtn.setAttribute('data-action', 'buy');
          });
        }

        // Logout button handler
        if (logoutBtn) {
          logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
            window.location.href = './registration.html';
          });
        }
      } else {
        // Failed to fetch user info, log out
        logoutUser();
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      logoutUser();
    }
  } else {
    // User is not logged in
    if (getStartedBtn) getStartedBtn.style.display = 'inline-block';
    if (userProfile) userProfile.style.display = 'none';
  }

  // Image Upload Modal Functionality
  const imageUploadModal = new bootstrap.Modal(document.getElementById('imageUploadModal'));
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const applyStyleBtn = document.getElementById('applyStyleBtn');
  const selectedModelName = document.getElementById('selectedModelName');

  // Add click event listeners to all model items
  document.querySelectorAll('.features-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const modelName = this.querySelector('h3 a').textContent;
      selectedModelName.textContent = modelName;
      imageUploadModal.show();
    });
  });

  // Handle image upload and preview
  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
        applyStyleBtn.disabled = false;
      }
      reader.readAsDataURL(file);
    }
  });

  // Handle apply style button click
  applyStyleBtn.addEventListener('click', function() {
    // For now, just show an alert
    alert(`Styling image with ${selectedModelName.textContent}. This feature will be implemented soon!`);
    imageUploadModal.hide();
    // Reset the form
    document.getElementById('imageUploadForm').reset();
    imagePreviewContainer.style.display = 'none';
    applyStyleBtn.disabled = true;
  });
});

/**
 * Handle "Buy Now" Button Clicks for Stripe Checkout and Subscription Management
 */
document.querySelectorAll('.buy-btn').forEach(button => {
  button.addEventListener('click', async function(event) {
    event.preventDefault(); // Prevent default action

    const action = this.getAttribute('data-action');
    const packageName = this.getAttribute('data-package');
    const lookupKey = this.getAttribute('data-lookup-key');
    const packageType = this.getAttribute('data-type');

    if (action === 'cancel') {
      // Handle cancellation
      showConfirmationModal('cancel', packageName, async function() {
        try {
          const response = await authFetch(AppConfig.getApiUrl('/payments/cancel-subscription'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            alert('Subscription cancelled successfully.');
            window.location.reload();
          } else {
            const data = await response.json();
            alert(data.message || 'Failed to cancel subscription.');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred while cancelling the subscription.');
        }
      });
    } else if (action === 'update') {
      // Handle subscription update
      showConfirmationModal('update', packageName, async function() {
        try {
          const response = await authFetch(AppConfig.getApiUrl('/payments/update-subscription'), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lookup_key: lookupKey }),
          });
          if (response.ok) {
            alert('Subscription updated successfully.');
            window.location.reload();
          } else {
            const data = await response.json();
            alert(data.message || 'Failed to update subscription.');
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred while updating the subscription.');
        }
      });
    } else {
      // Handle purchase (e.g., for one-time purchases or new subscription)
      const endpoint = packageType === 'subscription'
          ? AppConfig.getApiUrl('/payments/create-subscription-checkout-session')
          : AppConfig.getApiUrl('/payments/create-one-time-checkout-session');

      const requestBody = {
        lookup_key: lookupKey
      };

      try {
        const response = await authFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response) {
          return;
        }

        if (!response.ok) {
          if (response.status === 400) {
            const data = await response.json();
            alert(data.message || 'Failed to create checkout session.');
          } else {
            throw new Error('Failed to create checkout session');
          }
          return;
        }

        const data = await response.json();
        const sessionUrl = data.sessionUrl;

        window.location.href = sessionUrl;
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the checkout session.');
      }
    }
  });
});

/**
 * Show Confirmation Modal for Cancel or Update Actions
 */
function showConfirmationModal(actionType, packageName, confirmCallback) {
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  const confirmationMessage = document.getElementById('confirmationMessage');
  const confirmActionBtn = document.getElementById('confirmActionBtn');

  if (actionType === 'cancel') {
    confirmationMessage.textContent = `Are you sure you want to cancel your ${packageName}?`;
  } else if (actionType === 'update') {
    confirmationMessage.textContent = `Are you sure you want to update your subscription to ${packageName}? This will go into effect on your next billing cycle.`;
  }

  // Remove previous event listener to prevent multiple handlers
  confirmActionBtn.replaceWith(confirmActionBtn.cloneNode(true));
  const newConfirmActionBtn = document.getElementById('confirmActionBtn');

  newConfirmActionBtn.addEventListener('click', async function() {
    newConfirmActionBtn.disabled = true;
    await confirmCallback();
    confirmationModal.hide();
    newConfirmActionBtn.disabled = false;
  });

  confirmationModal.show();
}
/**
 * Login and Registration Functionality
 * Moved from registration.html to main.js
 */

// Regular expressions for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^.{6,}$/;

// Registration
const signupBtn = document.getElementById('signup-btn');
if (signupBtn) {
  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');
  const confirmPasswordInput = document.getElementById('signup-password-confirm');
  const termsCheckbox = document.getElementById('termsCheckbox');

  // Password Requirements Elements
  const requirementNumber = document.getElementById('requirement-number');
  const requirementSpecial = document.getElementById('requirement-special');
  const requirementUppercase = document.getElementById('requirement-uppercase');
  const requirementLowercase = document.getElementById('requirement-lowercase');

  // Event listener for password input
  passwordInput.addEventListener('input', function () {
    const password = passwordInput.value;

    // Check for at least 1 number
    if (/\d/.test(password)) {
      requirementNumber.classList.add('valid');
    } else {
      requirementNumber.classList.remove('valid');
    }

    // Check for at least 1 special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      requirementSpecial.classList.add('valid');
    } else {
      requirementSpecial.classList.remove('valid');
    }

    // Check for at least 1 uppercase letter
    if (/[A-Z]/.test(password)) {
      requirementUppercase.classList.add('valid');
    } else {
      requirementUppercase.classList.remove('valid');
    }

    // Check for at least 1 lowercase letter
    if (/[a-z]/.test(password)) {
      requirementLowercase.classList.add('valid');
    } else {
      requirementLowercase.classList.remove('valid');
    }
  });

  signupBtn.addEventListener('click', async function () {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const passwordConfirm = confirmPasswordInput.value.trim();

    let isValid = true;

    // Validate Email
    if (!email) {
      emailInput.classList.add('is-invalid');
      emailInput.nextElementSibling.textContent = 'Please enter your email.';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      emailInput.classList.add('is-invalid');
      emailInput.nextElementSibling.textContent = 'Please enter a valid email address.';
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
    }

    // Validate Password
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);

    if (!password) {
      passwordInput.classList.add('is-invalid');
      passwordInput.nextElementSibling.textContent = 'Please enter a password.';
      isValid = false;
    } else if (password.length < 6) {
      passwordInput.classList.add('is-invalid');
      passwordInput.nextElementSibling.textContent = 'Password must be at least 6 characters.';
      isValid = false;
    } else if (!hasNumber || !hasSpecialChar || !hasUppercase || !hasLowercase) {
      passwordInput.classList.add('is-invalid');
      passwordInput.nextElementSibling.textContent = 'Password does not meet the requirements.';
      isValid = false;
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    // Validate Password Confirmation
    if (!passwordConfirm) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordInput.nextElementSibling.textContent = 'Please confirm your password.';
      isValid = false;
    } else if (password !== passwordConfirm) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordInput.nextElementSibling.textContent = 'Passwords do not match.';
      isValid = false;
    } else {
      confirmPasswordInput.classList.remove('is-invalid');
    }

    // Validate Terms Checkbox
    if (!termsCheckbox.checked) {
      termsCheckbox.classList.add('is-invalid');
      termsCheckbox.nextElementSibling.classList.add('text-danger');
      isValid = false;
    } else {
      termsCheckbox.classList.remove('is-invalid');
      termsCheckbox.nextElementSibling.classList.remove('text-danger');
    }

    if (!isValid) {
      return;
    }

    // Disable the button to prevent multiple submissions
    signupBtn.disabled = true;
    signupBtn.textContent = 'Signing up...';

    // Remove any previous error message
    let errorMsg = document.getElementById('signup-error-msg');
    if (errorMsg) {
      errorMsg.remove();
    }

    try {
      // Proceed with fetch request
      const response = await fetch(AppConfig.getApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // Signup successful, redirect to welcome
        window.location.href = './welcome.html';
      } else {
        // Signup failed, show error message
        errorMsg = document.createElement('div');
        errorMsg.id = 'signup-error-msg';
        errorMsg.classList.add('alert', 'alert-danger', 'mt-2');
        errorMsg.textContent = data.message || 'Signup failed. Please try again.';
        signupBtn.parentNode.appendChild(errorMsg);
      }
    } catch (error) {
      // Network or other error
      errorMsg = document.createElement('div');
      errorMsg.id = 'signup-error-msg';
      errorMsg.classList.add('alert', 'alert-danger', 'mt-2');
      errorMsg.textContent = 'An error occurred. Please try again later.';
      signupBtn.parentNode.appendChild(errorMsg);
    } finally {
      // Re-enable the button
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign up';
    }
  });
}

// Login
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', async function () {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    let isValid = true;

    // Validate Email
    if (!email) {
      emailInput.classList.add('is-invalid');
      emailInput.nextElementSibling.textContent = 'Please enter your email.';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      emailInput.classList.add('is-invalid');
      emailInput.nextElementSibling.textContent = 'Please enter a valid email address.';
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
    }

    // Validate Password
    if (!password) {
      passwordInput.classList.add('is-invalid');
      passwordInput.nextElementSibling.textContent = 'Please enter your password.';
      isValid = false;
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      return;
    }

    // Disable the button to prevent multiple submissions
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    // Remove any previous error message
    // let errorMsg = document.getElementById('login-error-msg');
    // if (errorMsg) {
    //   errorMsg.remove();
    // }

    try {
      // Proceed with fetch request
      const response = await fetch(AppConfig.getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // Login successful, store tokens and redirect
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        window.location.href = './index.html';
      } else {
        // Login failed, show error message
        errorMsg = document.createElement('div');
        errorMsg.id = 'login-error-msg';
        errorMsg.classList.add('alert', 'alert-danger', 'mt-2');
        errorMsg.textContent = data.message || 'Login failed. Please check your credentials.';
        loginBtn.parentNode.appendChild(errorMsg);
      }
    } catch (error) {
      // Network or other error
      errorMsg = document.createElement('div');
      errorMsg.id = 'login-error-msg';
      errorMsg.classList.add('alert', 'alert-danger', 'mt-2');
      errorMsg.textContent = 'An error occurred. Please try again later.';
      loginBtn.parentNode.appendChild(errorMsg);
    } finally {
      // Re-enable the button
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
}
