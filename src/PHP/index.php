<?php

	/**
	 * Procreate Reader Example
	 */

?><!DOCTYPE html>
<html>
	<head>
	</head>
	<body><?
if(isset($_FILES['file']) or file_exists('sample.procreate'))
{
	include 'lib/ProcreateDocument.php';

	$document = new Procreate\Document(file_exists('sample.procreate') ? 'sample.procreate' : $_FILES['file']);
}
else
{ ?>

		<p>Select a .PROCREATE file to deconstruct it.</p>
		<form action="" method="post" enctype="multipart/form-data">
			<input type="file" name="file" accepts="*.procreate" /> <button>Submit</button>
		</form><?
} ?>

	</body>
</html>