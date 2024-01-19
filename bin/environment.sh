#Update environments, copied over from other repo
if [ $1 == "dev" ]
then
  export CDK_WEBSITE_NAME="dev-website"  
  

elif [ $1 == "prd" ]
then
  export CDK_WEBSITE_NAME="prd-website"  

else
  echo "No ENV specified"
  exit;
fi