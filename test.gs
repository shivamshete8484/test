package com.example.userservice

uses java.time.LocalDateTime
uses java.util.ArrayList
uses java.util.HashMap
uses java.util.List
uses java.util.Map
uses com.example.repository.UserRepository
uses com.example.logging.Logger
uses com.example.model.User
uses com.example.model.UserStatus

class UserService extends BaseService {

  var repository : UserRepository
  var logger : Logger
  var cache : Map<String, User>

  construct(repository : UserRepository, logger : Logger) {
    super(logger)
    this.repository = repository
    this.logger = logger
    this.cache = new HashMap<String, User>()
  }

  function getUser(userId : String) : User {
    if (!validateUserId(userId)) {
      logger.warn("Invalid user ID: " + userId)
      return null
    }

    if (cache.containsKey(userId)) {
      logger.info("Returning user from cache: " + userId)
      return cache.get(userId)
    }

    var user = repository.findById(userId)

    if (user != null) {
      cache.put(userId, user)
      logger.info("User loaded from repository: " + userId)
    } else {
      logger.info("User not found: " + userId)
    }

    return user
  }

  function getUsers(userIds : List<String>) : List<User> {
    var users = new ArrayList<User>()

    if (userIds == null or userIds.Empty) {
      return users
    }

    for (userId in userIds) {
      var user = getUser(userId)
      if (user != null) {
        users.add(user)
      }
    }

    return users
  }

  function createUser(userId : String, name : String, email : String) : User {
    if (!validateUserId(userId)) {
      throw new IllegalArgumentException("Invalid user ID")
    }

    if (name == null or name.trim().Empty) {
      throw new IllegalArgumentException("Name is required")
    }

    if (email == null or email.trim().Empty) {
      throw new IllegalArgumentException("Email is required")
    }

    if (repository.existsByEmail(email)) {
      logger.warn("User already exists: " + email)
      throw new IllegalStateException("User already exists")
    }

    var user = new User(
      userId, name, email, UserStatus.ACTIVE, LocalDateTime.Now
    )

    repository.save(user)
    cache.put(userId, user)
    audit("Created user: " + userId)

    return user
  }

  function updateEmail(userId : String, newEmail : String) : boolean {
    var user = getUser(userId)

    if (user == null) {
      return false
    }

    if (newEmail == null or newEmail.trim().Empty) {
      logger.warn("Email cannot be empty")
      return false
    }

    user.Email = newEmail
    repository.update(user)
    cache.put(userId, user)
    audit("Updated email for user: " + userId)

    return true
  }

  function deleteUser(userId : String) : boolean {
    try {
      var user = getUser(userId)

      if (user == null) {
        logger.info("Cannot delete missing user: " + userId)
        return false
      }

      repository.deleteById(userId)
      cache.remove(userId)
      audit("Deleted user: " + userId)

      return true
    } catch (e : RuntimeException) {
      logger.error("Failed to delete user: " + userId, e)
      return false
    }
  }

  function searchUsers(searchTerm : String) : List<User> {
    if (searchTerm == null or searchTerm.trim().Empty) {
      return new ArrayList<User>()
    }

    var normalizedTerm = searchTerm.trim().toLowerCase()
    var results = repository.searchByName(normalizedTerm)

    logger.info("Search returned " + results.size() + " users")
    return results
  }

  function changeStatus(userId : String, status : UserStatus) : boolean {
    var user = getUser(userId)

    if (user == null) {
      return false
    }

    if (status == null) {
      logger.warn("Status cannot be null")
      return false
    }

    user.Status = status
    repository.update(user)
    cache.put(userId, user)

    audit("Changed status for user " + userId + " to " + status)

    return true
  }

  function clearCache() {
    var size = cache.size()
    cache.clear()
    logger.info("Cleared " + size + " cached users")
  }

  override function audit(message : String) {
    logger.audit(message)
  }

  private function validateUserId(userId : String) : boolean {
    return userId != null and userId.length > 2
  }
}

abstract class BaseService {

  protected var logger : Logger

  construct(logger : Logger) {
    this.logger = logger
  }

  protected function logOperation(operation : String) {
    logger.info(operation)
  }
}

class UserServiceFactory {

  private var logger : Logger

  construct(logger : Logger) {
    this.logger = logger
  }

  function create(repository : UserRepository) : UserService {
    logger.info("Creating UserService")
    return new UserService(repository, logger)
  }

  function createMultiple(repository : UserRepository, count : int) : List<UserService> {
    var services = new ArrayList<UserService>()

    for (index in 0..|count) {
      services.add(create(repository))
    }

    return services
  }
}

class UserValidationUtil {

  static function validateEmail(email : String) : boolean {
    if (email == null or email.trim().Empty) {
      return false
    }
    return email.contains("@")
  }

  static function normalizeName(name : String) : String {
    if (name == null) {
      return ""
    }
    return name.trim().toLowerCase()
  }

  static function validateUser(user : User) : boolean {
    if (user == null) {
      return false
    }

    if (!validateEmail(user.Email)) {
      return false
    }

    return user.Name != null and !user.Name.trim().Empty
  }
}
