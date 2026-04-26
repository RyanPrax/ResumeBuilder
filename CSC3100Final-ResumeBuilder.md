# CSC3100 – Final | Resume Builder

Each year I have the opportunity to review student resumes through a combination of course work, workshops, and in preparation of students applying for jobs. Consistently I observe the additional work and burden it takes to not only craft the perfect details but also to produce and format the document. For this final project in our class, I am looking to you for help. We want to develop an application that will allow students to focus more on the content of the resume and less on the formatting. Below you will find some general guidelines and expectations. These guidelines and expectations should be considered the minimum qualifications for projects to receive a grade ranging from 80-89.4. Those students that go above these minimum qualifications will have the opportunity to earn a grade of 89.5-100 on the assignment.

## Statement on AI

You have been tested, quizzed, and evaluated on your knowledge of web development syntax and techniques already in this course. This final project will allow you to apply these new skills to a real-world problem. As such, you are allowed to use generative AI on this assignment. However, there are some caveats to be aware of.

* Any material or code that is generated with AI and used in your project becomes fair game for me to verbally discuss with you during Finals Week. If AI generates it, and you are unfamiliar with it – especially if it is something beyond what is covered in the class – make sure you understand how it is working. Failure to be able to explain a concept or code could result in a lowered grade.
* Please use AI as it will be used in the industry. Prompt engineering and the ability to work with a GPT is great, but it is not how emerging workflows exist. Consider using orchestration and agentic capabilities as well as rules files to start building your workflow.
* All AI-related configurations must be documented and provided with your code. This documentation includes summaries of how it was used, your rules file, and MCP server details, as well as comments in your code reflecting where AI was used

## Technologies

You must base your application on the primary tooling from our class. Particularly you must use HTML/CSS/Javascript on the frontend without the use of React or other frameworks. The CSS styling can use either Bootstrap or Tailwind but custom CSS outside of those libraries should be limited. The backend of your application must use nodeJS with express to develop RESTful web services. You may not use a MVC or SSR approach to the development of your application. The data associated with your application that students are adding should be stored in an SQLite database.

## User Experience

The application should be developed as something that users can run locally on their computers. One way to earn points towards an A grade would be to wrap the application as an ElectronJS app. Remember that accessibility is of the upmost importance as you develop – everyone deserves the opportunity to use our applications. You MUST score a 93 or higher on your Lighthouse accessibility test. Documentation of this score must be included with your submission.

Unfortunately, as we have discussed in class, users often base their initial and even long-term feelings of a product on its UX/UI. Your application should look aesthetically pleasing and usable. Further, the application should be developed as a single page application meaning you will have a single index.html that will show/hide or load/unload portions of the DOM as the user interacts with it.

While developing your application, make sure that you brand it with a unique name and iconography. Recall back to our weather app on how to include not only a general favicon but also other icons.

## Project Organization

This project is a great time to begin applying concepts from DevOps to your development process; particularly, you should utilize a GitHub repository to maintain version control. Your GitHub repository should be a public repository, and you MUST include a link to it within your submission.

Remember that we want to keep our code maintainable. To assist with this requirement, you should not include all your Javascript and CSS in the main index.html. Consider modularizing your files to split functionality among several files.

Speaking of external files, any libraries that are used must be attributed on your application. You may do this with a thank you popup that can been accessed by users indicating that your application is built on the work of those libraries. You may NOT use CDNs to access the libraries – they must all be contained within your application’s directory structure.

## The Project Summary

You are building an application to help users create a resume. As you know, or will learn in Professionalism, resumes should be tailored to the job you are applying to. With this in mind, you should enable users to create jobs and store the responsibilities/details for those jobs within your database. Then when creating/generating the resume, the user should be able to select the jobs and the responsibilities/details that they wish to include. The same setup and selection process should be available for various skills or skills categories, certifications, and awards.

When allowing users to enter in their details, you MUST leverage a Generative AI API to review and provide suggestions for changes after a user enters in details. There are many ways to build this prompt that you may explore. For development I suggest you use the Free Tier of the Google Gemini API. Further, the user should be able to provide their own Gemini API key that can be stored within the application. You should NOT plan to deploy the application with your API key. NOTE: Use a .env file to store this type of information while developing – and remember to add .env to your .gitignore so it will not show up in your public repository.

The data that the user enters should be stored in the SQLite database. If you need help building your database, please come see me.

Up to this point, everything that has been required to be completed has been demonstrated and/or discussed in class. The challenge of this project is to handle the layout of the resume for both a digital, web-based view as well as a print layout. I HIGHLY recommend you leverage generative AI to assist with this portion of the code.

## Note from the Instructor

Thank you for taking this course. I have likely mentioned many times that the web development course is my favorite to teach. The reason for this affinity for the course is the low-entry point required to begin development and see an outcome that you may share with others. The sheer quantity of individuals in the United States, and more broadly in the world, that have access to a device that can ingest and interact with web applications is huge. Additionally, in our Software Engineering Capstone courses the majority of the requests from clients are to build a CRUD web application. By taking this course, you have given yourself the tools and skills needed to more quickly contribute to those projects.

I realize that the instructions for this assignment are quite long and extensive, but when you break them down, the work is fairly limited in scope. The project is expected to be a challenge, and I am confident that you will rise to the challenge and due amazing on it. This is the type of project that looks great on your resume, and if allowed by you, I would like to share the best projects with future professionalism classes as well as other students.

Final thoughts, do NOT wait until the last minute to work on or complete this assignment. It is easy to give in to the procrastination monkey ([Inside the Mind of a Master Procrastinator by Time Urban via TED](https://www.youtube.com/watch?v=arj7oStGLkU)), but if you start on this assignment earlier, it will provide more opportunity to improve your assignment. Going beyond the basics shared in this document will give you an opportunity to excel and get an amazing grade out of the project. I am available, and enjoy the chance, to help if you get stuck. It’s okay to struggle a little, but once you get frustrated you should reach out or come by office hours.

## The Submission

You will be submitting a compressed ZIP folder that contains:

* All files associated with your project
* Documentation related to your use of generative AI – even if you did not use it, you MUST indicate this in your submission
* A link to the GitHub repository for your application
* An example PDF of a resume that is built with your application
* Any special instructions that may be needed to run or install your application
* A statement indicating if it is okay or not to share your project with other students to help with developing their resumes
* Either a candid image of you developing the application or an AI-generated image of you as your favorite animal working on developing the application. If you allow the sharing of your application, and it is passed along to other students, this image will be used to represent you as the author
