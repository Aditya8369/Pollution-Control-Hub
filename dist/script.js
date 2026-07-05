
window.onload = function () {
    alert("🌍 Welcome to Pollution Control Hub!");
};

const form = document.querySelector("form");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.querySelector("input[type='text']").value;
    const email = document.querySelector("input[type='email']").value;
    const suggestion = document.querySelector("textarea").value;

    if (name === "" || email === "" || suggestion === "") {
        alert("Please fill all the fields.");
    } else {
        alert("Thank you, " + name + "! Your feedback has been submitted.");
        form.reset();
    }
});
