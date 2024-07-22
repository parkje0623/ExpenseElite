const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var allConditionsMet = false;

document.addEventListener("DOMContentLoaded", function() {
    // Dark Mode Setting
    // const darkModeToggle = document.getElementById('darkModeToggle');
    // darkModeToggle.addEventListener('change', function() {
    //   if (darkModeToggle.checked) {
    //       document.body.classList.add('dark-mode');
    //   } else {
    //       document.body.classList.remove('dark-mode');
    //   }
    // });

    // Password Reset Setting
    const passwordInput = document.getElementById("newPassword");
    const passwordConditions = [
        document.getElementById("password-length"),
        document.getElementById("password-lowercase"),
        document.getElementById("password-uppercase"),
        document.getElementById("password-number"),
        document.getElementById("password-special"),
    ];

    const checkPasswordConditions = () => {
        const password = passwordInput.value;
        const conditionsCheck = [
            password.length >= 8,
            /[a-z]/.test(password),
            /[A-Z]/.test(password),
            /\d/.test(password),
            /[!@#$%^&*()+\-=[\]{};':"\\|,.<>/?]+/.test(password)
        ];

        for (let i = 0; i < passwordConditions.length; i++) {
            if (conditionsCheck[i]) {
                passwordConditions[i].classList.remove("text-muted");
                passwordConditions[i].classList.remove("text-danger");
                passwordConditions[i].classList.add("text-success");
            } else {
                passwordConditions[i].classList.remove("text-muted");
                passwordConditions[i].classList.remove("text-success");
                passwordConditions[i].classList.add("text-danger");
            }

            if (passwordInput.value === "") {
                passwordConditions[i].classList.add("text-muted");
            }
        }

        if (!conditionsCheck.every(condition => condition)) {
            allConditionsMet = false;
        } else {
            allConditionsMet = true;
        }
    };

    passwordInput.addEventListener("input", checkPasswordConditions);
});


function updatePassword(event) {
    event.preventDefault();

    if (!allConditionsMet) {
        document.getElementById("password-updated").style.display = "none";
        document.getElementById("password-confirm-error").style.display = "none";
        document.getElementById("password-condition-error").style.display = "block";
        return false;
    } else {
        document.getElementById("password-condition-error").style.display = "none";

        const pwd = document.getElementById('confirmPassword');
        const new_pwd = document.getElementById('newPassword');
        fetch('/update_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                password: pwd.value.trim(),
                new_password: new_pwd.value.trim()
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                document.getElementById("password-updated").style.display = "block";
                document.getElementById("password-confirm-error").style.display = "none";
                console.log('Password updated succesfully');
            } else {
                document.getElementById("password-confirm-error").style.display = "block";
                document.getElementById("password-updated").style.display = "none";
                console.error('Confirming original password incorrect');
            }
        })
        .catch(error => {
            console.error('Error updating password: ', error);
            alert('An error occurred while updating the password.');
        });
    }
}

function deleteAccount() {
    const confirmation = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (confirmation) {
        document.getElementById('passwordModal').style.display = 'block';
    }
}

function submitForm(event) {
    event.preventDefault();

    const enter_pwd = document.getElementById('passwordInput').value;
    if (enter_pwd) {
        fetch('/delete_account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                password: enter_pwd
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Account deleted succesfully');
                location.reload();
            } else {
                closeModal();
                alert('Incorrect password entered, cannot delete the account. Please try again.');
                console.error('Wrong password, account cannot be deleted');
            }
        })
        .catch(error => {
            closeModal();
            console.error('Error deleting an account: ', error);
            alert('An error occurred while deleting the account.');
        });
    } else {
        alert("Password is required to delete the account.");
    }
}

function closeModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
}



