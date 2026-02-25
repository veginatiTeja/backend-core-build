exports.testAsync = async (req,res) => {
   
       await new Promise((resolve) => setTimeout(resolve,1000));
      // console.log("woking on test controller ");

      res.json({
         success: true,
         message: "Hello from async test controlloer"
      })
       //intentionally throws error

      //  throw new Error("Something went wrong in async!");
}