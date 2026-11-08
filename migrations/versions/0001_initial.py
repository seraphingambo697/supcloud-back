"""Initial schema

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None: 
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("oauth_provider", sa.String(50), nullable=True),
        sa.Column("oauth_sub", sa.String(255), nullable=True),
        sa.Column("quota_bytes", sa.BigInteger, nullable=False, server_default="32212254720"),
        sa.Column("used_bytes", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "file_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("item_type", sa.Enum("file", "folder", name="fileitemtype"), nullable=False),
        sa.Column("category", sa.Enum("image","video","audio","document","text","archive","other", name="filecategory"), nullable=False, server_default="other"),
        sa.Column("parent_id", UUID(as_uuid=True), sa.ForeignKey("file_items.id", ondelete="CASCADE"), nullable=True),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("size_bytes", sa.BigInteger, nullable=True),
        sa.Column("mime_type", sa.String(255), nullable=True),
        sa.Column("extension", sa.String(50), nullable=True),
        sa.Column("storage_path", sa.Text, nullable=True),
        sa.Column("thumbnail_path", sa.Text, nullable=True),
        sa.Column("is_trashed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("trashed_at", sa.DateTime, nullable=True),
        sa.Column("is_shared", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("modified_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_file_items_owner_id", "file_items", ["owner_id"])
    op.create_index("ix_file_items_parent_id", "file_items", ["parent_id"])
    op.create_index("ix_file_items_is_trashed", "file_items", ["is_trashed"])

    op.create_table(
        "share_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("token", sa.String(64), unique=True, nullable=False),
        sa.Column("file_item_id", UUID(as_uuid=True), sa.ForeignKey("file_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("download_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_share_links_token", "share_links", ["token"])

    op.create_table(
        "shared_folders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("folder_id", UUID(as_uuid=True), sa.ForeignKey("file_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_with", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("can_edit", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("shared_folders")
    op.drop_table("share_links")
    op.drop_table("file_items")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS fileitemtype")
    op.execute("DROP TYPE IF EXISTS filecategory")
