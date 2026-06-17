BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[users] ADD [failedLoginCount] INT NOT NULL CONSTRAINT [users_failedLoginCount_df] DEFAULT 0,
[lockedUntil] DATETIME2,
[resetPasswordExpires] DATETIME2,
[resetPasswordLastSent] DATETIME2,
[resetPasswordToken] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'ACTIVE',
[verificationExpires] DATETIME2,
[verificationToken] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
