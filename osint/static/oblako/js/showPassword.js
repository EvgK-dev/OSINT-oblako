

function show_hide_password(target){
	var input = document.getElementById('id_password');

	console.log(input)

	if (input.getAttribute('type') == 'password') {
		target.classList.add('view');
		input.setAttribute('type', 'text');
	} else {
		target.classList.remove('view');
		input.setAttribute('type', 'password');
	}
	return false;
}



