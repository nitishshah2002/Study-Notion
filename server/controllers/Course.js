const Course = require("../models/Course")
const Category = require("../models/Category")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const  uploadMediaToCloudinary  = require("../utils/uploadMediaToCloudinary")
const CourseProgress = require("../models/CourseProgress")
const { convertSecondsToDuration } = require("../utils/secToDuration")
// Function to create a new course


///************* */
const { uploadToCloudinary } = require("../utils/uploadMediaToCloudinary");
const fs = require("fs");

exports.createCourse = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "User ID is required" });
    }

    const userId = req.user.id;
    const {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body;

    let tag, instructions, newPrice;
    newPrice = Number(price);

    try {
      tag = JSON.parse(_tag);
      instructions = JSON.parse(_instructions);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid JSON format for tag or instructions" });
    }

    // Check for required fields
    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !instructions.length) {
      return res.status(400).json({ success: false, message: "All fields are mandatory" });
    }

    // Validate user as instructor
    const instructorDetails = await User.findById(userId);
    if (!instructorDetails || instructorDetails.accountType !== "Instructor") {
      return res.status(404).json({ success: false, message: "Instructor details not found" });
    }

    // Validate category
    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(404).json({ success: false, message: "Category details not found" });
    }

    // ✅ Handle Cloudinary thumbnail upload
    if (!req.files || !req.files.thumbnailImage) {
      return res.status(400).json({ success: false, message: "Thumbnail image is required" });
    }

    const thumbnailImage = req.files.thumbnailImage;
    const filePath = thumbnailImage.tempFilePath || thumbnailImage.path;

    let uploadResponse;
    try {
      uploadResponse = await uploadToCloudinary(filePath, process.env.FOLDER_NAME || "StudyNotion");
    } catch (uploadErr) {
      console.error("❌ Cloudinary Upload Error:", uploadErr);
      return res.status(500).json({ success: false, message: "Thumbnail image upload failed" });
    }

    // Optionally delete local temp file
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    // Create the course
    const newCourseData = {
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price: newPrice,
      tag,
      category: categoryDetails._id,
      status: status || "Draft",
      instructions,
      thumbnail: uploadResponse.secure_url, // ✅ Add thumbnail URL to course
    };

    const newCourse = await Course.create(newCourseData);

    // Update instructor and category with the new course
    await User.findByIdAndUpdate(userId, { $push: { courses: newCourse._id } }, { new: true });
    await Category.findByIdAndUpdate(category, { $push: { courses: newCourse._id } }, { new: true });

    res.status(200).json({
      success: true,
      data: newCourse,
      message: "Course created successfully",
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};


// exports.createCourse = async (req, res) => {
//   try {
//     // Check if user is authenticated
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ success: false, message: "User ID is required" });
//     }

//     const userId = req.user.id;
//     const {
//       courseName,
//       courseDescription,
//       whatYouWillLearn,
//       price,
//       tag: _tag,
//       category,
//       status,
//       instructions: _instructions,
//     } = req.body;

//     let tag, instructions, newPrice;
//     newPrice = Number(price);

//     try {
//       tag = JSON.parse(_tag);
//       instructions = JSON.parse(_instructions);
//     } catch (err) {
//       return res.status(400).json({ success: false, message: "Invalid JSON format for tag or instructions" });
//     }

//     // Check for required fields
//     if (!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !instructions.length) {
//       return res.status(400).json({ success: false, message: "All fields are mandatory" });
//     }

//     // Validate user as instructor
//     const instructorDetails = await User.findById(userId);
//     if (!instructorDetails || instructorDetails.accountType !== "Instructor") {
//       return res.status(404).json({ success: false, message: "Instructor details not found" });
//     }

//     // Validate category
//     const categoryDetails = await Category.findById(category);
//     if (!categoryDetails) {
//       return res.status(404).json({ success: false, message: "Category details not found" });
//     }

//     // Create the course
//     const newCourseData = {
//       courseName,
//       courseDescription,
//       instructor: instructorDetails._id,
//       whatYouWillLearn,
//       price: newPrice,
//       tag,
//       category: categoryDetails._id,
//       status: status || "Draft",
//       instructions,
//     };

//     const newCourse = await Course.create(newCourseData);

//     // Update instructor and category with the new course
//     await User.findByIdAndUpdate(userId, { $push: { courses: newCourse._id } }, { new: true });
//     await Category.findByIdAndUpdate(category, { $push: { courses: newCourse._id } }, { new: true });

//     res.status(200).json({
//       success: true,
//       data: newCourse,
//       message: "Course created successfully",
//     });
//   } catch (error) {
//     console.error("Error creating course:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create course",
//       error: error.message,
//     });
//   }
// };



// Edit Course Details
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const updates = req.body
    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({ error: "Course not found" })
    }

    // If Thumbnail Image is found, update it
    if (req.files) {
      console.log("thumbnail update")
      const thumbnail = req.files.thumbnailImage
      const thumbnailImage = await uploadMediaToCloudinary(
        thumbnail,
        process.env.FOLDER_NAME,"image"
      )
      course.thumbnail = thumbnailImage.secure_url
    }

    // Update only the fields that are present in the request body
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === "tag" || key === "instructions") {
          course[key] = JSON.parse(updates[key])
        } else {
          course[key] = updates[key]
        }
      }
    }

    await course.save()

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}
// Get Course List
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find(
      { status: "Published" },
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnrolled: true,
      }
    )
      .populate("instructor")
      .exec()

    return res.status(200).json({
      success: true,
      data: allCourses,
    })
  } catch (error) {
    console.log(error)
    return res.status(404).json({
      success: false,
      message: `Can't Fetch Course Data`,
      error: error.message,
    })
  }
}
// Get One Single Course Details
// exports.getCourseDetails = async (req, res) => {
//   try {
//     const { courseId } = req.body
//     const courseDetails = await Course.findOne({
//       _id: courseId,
//     })
//       .populate({
//         path: "instructor",
//         populate: {
//           path: "additionalDetails",
//         },
//       })
//       .populate("category")
//       .populate("ratingAndReviews")
//       .populate({
//         path: "courseContent",
//         populate: {
//           path: "subSection",
//         },
//       })
//       .exec()
//     // console.log(
//     //   "###################################### course details : ",
//     //   courseDetails,
//     //   courseId
//     // );
//     if (!courseDetails || !courseDetails.length) {
//       return res.status(400).json({
//         success: false,
//         message: `Could not find course with id: ${courseId}`,
//       })
//     }

//     if (courseDetails.status === "Draft") {
//       return res.status(403).json({
//         success: false,
//         message: `Accessing a draft course is forbidden`,
//       })
//     }

//     return res.status(200).json({
//       success: true,
//       data: courseDetails,
//     })
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     })
//   }
// }
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "-videoUrl",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const userId = req.user.id
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    let courseProgressCount = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })

    console.log("courseProgressCount : ", courseProgressCount)

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.id

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 })

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    })
  }
}
// Delete the Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body

    // Find the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Unenroll students from the course
    const studentsEnrolled = course.studentsEnroled
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      })
    }

    // Delete sections and sub-sections
    const courseSections = course.courseContent
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId)
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId)
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
