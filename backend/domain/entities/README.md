# Domain Entities

This directory will contain the core domain entities for the battle system.

## Planned Entities

### Player

- User account information
- Authentication details
- Profile settings
- Battle statistics

### Character

- Character attributes (health, attack, defense, speed)
- Character level and experience
- Character type and abilities
- Belongs to a Player

### Attack

- Attack name and description
- Damage calculation
- Attack type and effects
- Belongs to a Character

### Battle

- Battle state and progress
- Turn management
- Battle participants
- Battle outcome and rewards

### PlayerParticipant

- Player's character in a specific battle
- Current health and status effects
- Turn order and actions

## Implementation Notes

- Use strict TypeScript with proper interfaces
- Implement domain validation rules
- Keep entities focused on business logic
- Avoid infrastructure concerns in entities
- Use value objects for complex properties

## TODO

- [ ] Define entity interfaces
- [ ] Implement entity classes
- [ ] Add domain validation
- [ ] Create entity tests
- [ ] Document business rules
