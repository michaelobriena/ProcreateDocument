<?php

	/**
	 * Procrreate Document Class
	 * v 1.0.0
	 * © Ryan Boylett 2017
	 */

	namespace Procreate;
	use CFPropertyList;

	// Require the CFPropertyList class
	require_once __DIR__ . '/CFPropertyList/classes/CFPropertyList/CFPropertyList.php';

	class Document
	{
		public $document_class      = 0;
		public $document_classes    = array();
		public $document_ns_objects = array();
		public $document_data       = array();
		public $document_name       = 'Untitled Document';
		public $document_size       = array(0, 0);
		public $document_thumbnail  = NULL;

		public $layers              = array();

		public $file_name           = '';
		public $file_size           = 0;

		public function __construct($data)
		{
			// We can supply a filename here if we want
			if(is_string($data))
			{
				if(file_exists($data))
				{
					$this->document_name = basename($data);
					$this->file_name     = $data;
					$this->file_size     = filesize($data);
				}
				else
				{
					throw new Exception('ProcreateDocument was unable to find the specified file.');
				}
			}
			// Usually, though, we'll want to deal with an uploaded file
			else if(is_array($data) and isset($data['name']) and isset($data['tmp_name']))
			{
				$this->document_name = $data['name'];
				$this->file_name     = $data['tmp_name'];
				$this->file_size     = filesize($data['tmp_name']);
			}

			if($this->file_name)
			{
				$this->extract();
			}
			else
			{
				throw new Exception('ProcreateDocument was unable to read the uploaded file.');
			}
		}

		public function extract()
		{
			// A procreate document is just a renamed PKG (read: ZIP) file
			$zip    = new \ZipArchive();
			$chunks = array();
			
			if($zip->open($this->file_name))
			{
				for($i = 0; $i < $zip->numFiles; $i ++)
				{
					$file = $zip->statIndex($i);

					if($file['name'] == 'Document.archive')
					{
						$archive = $file;
					}
					else if($file['name'] == 'QuickLook/Thumbnail.png')
					{
						$this->document_thumbnail = $file;
					}
					else
					{
						$chunks[$file['name']] = $file;
					}
				}

				if($archive)
				{
					$binary_plist = $zip->getFromIndex($archive['index']);
					$tmp          = __DIR__ . '/' . rand(0, time()) . '.tmp';

					if(file_put_contents($tmp, $binary_plist))
					{
						$plist = new \CFPropertyList\CFPropertyList($tmp, \CFPropertyList\CFPropertyList::FORMAT_BINARY);

						$plist   = $plist->toArray();
						$archive = $plist['$objects'];

						@unlink($tmp);

						$this->document_data = $archive[1];
						$this->document_name = $archive[2];
						$this->document_size = explode(', ', trim($archive[3], '{} '));

						unset($archive[0], $archive[1], $archive[2], $archive[3]);

						$this->document_class   = $archive[4]['$class'];
						$this->document_classes = array
						(
							$archive[4]['$class'] => $archive[$archive[4]['$class']]
						);

						unset($archive[$archive[4]['$class']]);

						$this->document_ns_objects = array();

						foreach($archive[4]['NS.objects'] as $object)
						{
							$this->document_ns_objects[$object] = $archive[$object];

							unset($archive[$object]);
						}

						unset($archive[4]);

						foreach($archive as $index => $object)
						{
							if(is_array($object) and isset($object['$classes']))
							{
								$this->document_classes[$index] = $object;

								unset($archive[$index]);
							}
						}

						foreach($archive as $index => $object)
						{
							if(!is_string($object))
							{
								unset($archive[$index]);
							}
						}

						foreach($archive as $index => $object)
						{
							if(preg_match("/^([a-zA-Z0-9]{8})-([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4})-([a-zA-Z0-9]{12})$/", $object))
							{
								$layer = array
								(
									"chunk_name" => $object,
									"chunks"     => array()
								);

								if(isset($archive[$index + 1]))
								{
									$layer['name'] = $archive[$index + 1];
								}

								foreach($chunks as $name => $chunk)
								{
									if($object == substr($name, 0, 36))
									{
										$data = $zip->getFromName($name);

										// TODO - LZO Decompress

										$tmp = __DIR__ . '/' . rand(0, time()) . '.png';

										$im = new \Imagick();
										$im->readImageBlob($data);
										$im->setImageFormat('png');

										$chunk['binary']   = base64_encode($im->getImageBlob());
										$layer['chunks'][] = $chunk;

										$im->clear();
										$im->destroy();
									}
								}

								$this->layers[$index] = $layer;
							}
						}
					}
					else
					{
						throw new Exception('ProcreateDocument could not create the required temporary files.');
					}
				}
				else
				{
					throw new Exception('ProcreateDocument did not find a `Document.archive` file, meaning this procreate document is corrupt.');
				}
			}
			else
			{
				throw new Exception('ProcreateDocument was unable to extract the uploaded file\'s contents.');
			}

			foreach($this->layers as $layer)
			{
				//echo '<img src="base64:image/png;base64,' . $layer['binary'] . '" />';
			}
		}
	}